'use strict'

const { Router } = require('express')
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')

const router = Router()

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Body: { email, password, fullName? }
router.post('/register', async (req, res) => {
  const { email, password, fullName } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,         // auto-confirm so no extra email needed for dev
    user_metadata: { full_name: fullName || '' },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.full_name,
    },
  })
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' })
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password })

  if (error) {
    return res.status(401).json({ error: error.message })
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.full_name,
    },
  })
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Header: Authorization: Bearer <access_token>
router.post('/logout', requireAuth, async (req, res) => {
  // Revoke the session server-side using the admin client
  await supabaseAdmin.auth.admin.signOut(req.headers['authorization'].slice(7))
  return res.status(200).json({ message: 'Logged out successfully.' })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Header: Authorization: Bearer <access_token>
router.get('/me', requireAuth, (req, res) => {
  const { id, email, user_metadata } = req.user
  return res.status(200).json({
    id,
    email,
    fullName: user_metadata?.full_name || '',
  })
})

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
// Body: { refreshToken }
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {}

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required.' })
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data?.session) {
    return res.status(401).json({ error: error?.message || 'Unable to refresh session.' })
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  })
})

module.exports = router
