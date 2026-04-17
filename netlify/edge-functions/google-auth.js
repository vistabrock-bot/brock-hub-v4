/**
 * Netlify Edge Function — Google OAuth 2.0
 *
 * Endpoints:
 *   GET  /api/google/auth/start    → redirect to Google consent screen
 *   GET  /api/google/auth/callback → exchange code for tokens, set httpOnly cookie
 *   POST /api/google/auth/refresh  → use refresh token to mint new access token
 *   POST /api/google/auth/logout   → clear session cookie
 *   GET  /api/google/auth/status   → return { connected, email }
 *
 * Environment variables required in Netlify → Site settings:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI  (e.g. https://brockfamily.netlify.app/api/google/auth/callback)
 *   SESSION_SECRET       (random 32-byte string, openssl rand -base64 32)
 *
 * Session storage:
 *   Refresh token is AES-GCM encrypted and stored in an httpOnly, Secure,
 *   SameSite=Lax cookie called `bfh_session`.
 *   Access tokens are never stored — they are minted on demand by the edge
 *   functions and are never sent to the browser.
 */

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

// ─── AES-GCM helpers ─────────────────────────────────────────────────────────

async function deriveKey(secret) {
  const enc = new TextEncoder()
  // Pad or truncate to exactly 32 bytes (256-bit key)
  const raw = enc.encode(secret.slice(0, 32).padEnd(32, '0'))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptSession(plaintext, secret) {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  // Prepend IV to ciphertext and base64-encode
  const buf = new Uint8Array(12 + ct.byteLength)
  buf.set(iv, 0)
  buf.set(new Uint8Array(ct), 12)
  return btoa(String.fromCharCode(...buf))
}

async function decryptSession(encrypted, secret) {
  try {
    const buf = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))
    const key = await deriveKey(secret)
    const dec = new TextDecoder()
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: buf.slice(0, 12) },
      key,
      buf.slice(12)
    )
    return dec.decode(pt)
  } catch {
    return null
  }
}

async function getSessionFromCookie(req, secret) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/bfh_session=([^;]+)/)
  if (!match) return null
  return decryptSession(match[1], secret)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req) {
  const url = new URL(req.url)
  const path = url.pathname

  const CLIENT_ID = Netlify.env.get('GOOGLE_CLIENT_ID')
  const CLIENT_SECRET = Netlify.env.get('GOOGLE_CLIENT_SECRET')
  const REDIRECT_URI = Netlify.env.get('GOOGLE_REDIRECT_URI')
  const SESSION_SECRET = Netlify.env.get('SESSION_SECRET') || 'changeme-set-SESSION_SECRET'

  const corsHeaders = {
    'access-control-allow-origin': req.headers.get('origin') || '*',
    'access-control-allow-credentials': 'true',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' },
    })
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Google Calendar integration is not configured.' }),
      { status: 503, headers: { 'content-type': 'application/json', ...corsHeaders } }
    )
  }

  // GET /api/google/auth/start — redirect to Google consent screen
  if (req.method === 'GET' && path.endsWith('/start')) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    return Response.redirect(authUrl.toString(), 302)
  }

  // GET /api/google/auth/callback — exchange code for tokens
  if (req.method === 'GET' && path.endsWith('/callback')) {
    const code = url.searchParams.get('code')
    const oauthError = url.searchParams.get('error')

    if (oauthError || !code) {
      const reason = encodeURIComponent(oauthError || 'missing_code')
      return Response.redirect(`/planner?gcal=error&reason=${reason}`, 302)
    }

    let tokens
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })
      tokens = await tokenRes.json()
      if (!tokenRes.ok) throw new Error(tokens.error || 'token_exchange_failed')
    } catch {
      return Response.redirect('/planner?gcal=error&reason=token_exchange_failed', 302)
    }

    if (!tokens.refresh_token) {
      // Google only returns a refresh token on first consent — prompt=consent handles this
      return Response.redirect('/planner?gcal=error&reason=no_refresh_token', 302)
    }

    // Fetch user email to include in session
    let email = ''
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      })
      if (userRes.ok) {
        const userInfo = await userRes.json()
        email = userInfo.email || ''
      }
    } catch {}

    const sessionData = JSON.stringify({ refresh_token: tokens.refresh_token, email })
    const encrypted = await encryptSession(sessionData, SESSION_SECRET)

    return new Response(null, {
      status: 302,
      headers: {
        location: '/planner?view=sync&gcal=connected',
        'set-cookie': `bfh_session=${encrypted}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`,
      },
    })
  }

  // POST /api/google/auth/refresh — mint a new access token from the session cookie
  if (req.method === 'POST' && path.endsWith('/refresh')) {
    const sessionStr = await getSessionFromCookie(req, SESSION_SECRET)
    if (!sessionStr) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }

    let session
    try {
      session = JSON.parse(sessionStr)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: session.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.access_token) {
      return new Response(JSON.stringify({ error: 'token_refresh_failed' }), {
        status: 401,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(
      JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in, email: session.email || '' }),
      { headers: { 'content-type': 'application/json', ...corsHeaders } }
    )
  }

  // POST /api/google/auth/logout — clear session cookie
  if (req.method === 'POST' && path.endsWith('/logout')) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'content-type': 'application/json',
        ...corsHeaders,
        'set-cookie': 'bfh_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      },
    })
  }

  // GET /api/google/auth/status — check if a valid session cookie is present
  if (req.method === 'GET' && path.endsWith('/status')) {
    const sessionStr = await getSessionFromCookie(req, SESSION_SECRET)
    if (!sessionStr) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }
    let session
    try {
      session = JSON.parse(sessionStr)
    } catch {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }
    return new Response(JSON.stringify({ connected: true, email: session.email || '' }), {
      headers: { 'content-type': 'application/json', ...corsHeaders },
    })
  }

  return new Response('Not Found', { status: 404 })
}

export const config = {
  path: [
    '/api/google/auth/start',
    '/api/google/auth/callback',
    '/api/google/auth/refresh',
    '/api/google/auth/logout',
    '/api/google/auth/status',
  ],
}
