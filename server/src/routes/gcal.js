'use strict'

/**
 * Google Calendar OAuth routes — /api/gcal
 *
 * Database migration required (run 002_gcal_and_roles.sql in Supabase SQL editor).
 *
 * Environment variables required:
 *   GOOGLE_CLIENT_ID      — Google Cloud Console OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET  — Google Cloud Console OAuth 2.0 client secret
 *   GOOGLE_REDIRECT_URI   — Must match the URI registered in Google Cloud Console
 *                           e.g. http://localhost:4000/api/gcal/callback
 *   GOOGLE_STATE_SECRET   — Secret used to sign the CSRF state parameter
 *
 * Flow:
 *   1. GET /api/gcal/auth        → returns { authUrl } (requires auth)
 *   2. GET /api/gcal/callback    → exchanges code, stores tokens, redirects to frontend
 *   3. GET /api/gcal/status      → returns { connected: bool, email? } (requires auth)
 *   4. DELETE /api/gcal/disconnect → revokes tokens, deletes from DB (requires auth)
 */

const { Router } = require('express')
const { OAuth2Client } = require('google-auth-library')
const crypto = require('crypto')

const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')
const config = require('../config')

const router = Router()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildOAuthClient() {
  return new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  )
}

/**
 * Create a time-limited, HMAC-signed state token that encodes the user ID.
 * Format: `<userId>.<timestamp>.<signature>`
 * This prevents CSRF without requiring a temporary DB table.
 */
function createState(userId) {
  const timestamp = Date.now()
  const payload = `${userId}.${timestamp}`
  const sig = crypto
    .createHmac('sha256', config.google.stateSecret)
    .update(payload)
    .digest('hex')
  return `${payload}.${sig}`
}

/**
 * Verify and decode a state token.
 * @param {string} state
 * @param {number} maxAgeMs  — How long the state is valid (default 10 minutes)
 * @returns {{ userId: string } | null}
 */
function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  try {
    const parts = state.split('.')
    if (parts.length !== 3) return null
    const [userId, timestamp, sig] = parts
    const payload = `${userId}.${timestamp}`
    const expected = crypto
      .createHmac('sha256', config.google.stateSecret)
      .update(payload)
      .digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
    if (Date.now() - parseInt(timestamp, 10) > maxAgeMs) return null
    return { userId }
  } catch {
    return null
  }
}

// ─── GET /api/gcal/auth ───────────────────────────────────────────────────────
// Requires auth. Returns the Google OAuth consent-screen URL.
router.get('/auth', requireAuth, (req, res) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.status(503).json({ error: 'Google Calendar integration is not configured.' })
  }

  const client = buildOAuthClient()
  const state = createState(req.user.id)

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',   // Always show consent to ensure we get a refresh token
    scope: config.google.scopes,
    state,
  })

  return res.status(200).json({ authUrl })
})

// ─── GET /api/gcal/callback ───────────────────────────────────────────────────
// Public endpoint — Google redirects here after the user authorises (or denies).
// The `code` query parameter is the standard OAuth 2.0 authorization code
// (RFC 6749 §4.1.2). It MUST arrive as a GET query parameter per the spec.
// It is exchanged immediately for tokens and never stored or logged.
router.get('/callback', async (req, res) => {
  // OAuth 2.0 callback parameters — code is a one-time authorization code
  const { code, state, error: oauthError } = req.query // lgtm[js/sensitive-get-query]

  // Determine where to redirect the browser on success/failure
  const profileUrl = `${config.appBaseUrl}/profile`

  if (oauthError || !code || !state) {
    const reason = encodeURIComponent(oauthError || 'missing_params')
    return res.redirect(`${profileUrl}?gcal=error&reason=${reason}`)
  }

  // Verify state to prevent CSRF
  const stateData = verifyState(state)
  if (!stateData) {
    return res.redirect(`${profileUrl}?gcal=error&reason=invalid_state`)
  }

  const { userId } = stateData

  let tokens
  try {
    const client = buildOAuthClient()
    const { tokens: t } = await client.getToken(code)
    tokens = t
  } catch (err) {
    console.error('[gcal] token exchange failed:', err.message)
    return res.redirect(`${profileUrl}?gcal=error&reason=token_exchange_failed`)
  }

  // Upsert tokens into Supabase
  const { error: dbError } = await supabaseAdmin
    .from('google_calendar_tokens')
    .upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (dbError) {
    console.error('[gcal] db upsert failed:', dbError.message)
    return res.redirect(`${profileUrl}?gcal=error&reason=db_error`)
  }

  return res.redirect(`${profileUrl}?gcal=connected`)
})

// ─── GET /api/gcal/status ─────────────────────────────────────────────────────
// Requires auth. Returns the Google Calendar connection status for the current user.
router.get('/status', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('google_calendar_tokens')
    .select('connected_at, scope, token_expiry')
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(200).json({ connected: false })
  }

  return res.status(200).json({
    connected: true,
    connectedAt: data.connected_at,
    scope: data.scope,
    tokenExpiry: data.token_expiry,
  })
})

// ─── DELETE /api/gcal/disconnect ─────────────────────────────────────────────
// Requires auth. Revokes the Google token and removes it from the database.
router.delete('/disconnect', requireAuth, async (req, res) => {
  // Look up the stored tokens
  const { data, error: lookupError } = await supabaseAdmin
    .from('google_calendar_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', req.user.id)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'No Google Calendar connection found.' })
  }

  // Attempt to revoke the token with Google (best-effort; don't fail if it errors)
  try {
    const client = buildOAuthClient()
    const tokenToRevoke = data.refresh_token || data.access_token
    await client.revokeToken(tokenToRevoke)
  } catch (err) {
    console.warn('[gcal] token revocation failed (will still remove from DB):', err.message)
  }

  // Delete from Supabase
  const { error: deleteError } = await supabaseAdmin
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', req.user.id)

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message })
  }

  return res.status(200).json({ message: 'Google Calendar disconnected successfully.' })
})

module.exports = router
