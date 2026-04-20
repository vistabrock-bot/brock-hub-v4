/**
 * Netlify Edge Function — Google Calendar API proxy
 *
 * Reads the bfh_session httpOnly cookie, refreshes the access token, and
 * proxies requests to the Google Calendar v3 API.  Access tokens are NEVER
 * stored or sent to the browser.
 *
 * Endpoints:
 *   GET    /api/calendar/list               → user's calendar list
 *   GET    /api/calendar/events?calendarId=X&syncToken=Y (or timeMin/timeMax)
 *   POST   /api/calendar/events             → create event  { calendarId, event }
 *   PATCH  /api/calendar/events/:eventId    → update event  { calendarId, patch }
 *   DELETE /api/calendar/events/:eventId?calendarId=X
 *
 * Environment variables required:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   SESSION_SECRET
 */

// ─── Session helpers (duplicated from google-auth.js — edge fns are isolated) ─

async function deriveKey(secret) {
  const enc = new TextEncoder()
  const raw = enc.encode(secret.slice(0, 32).padEnd(32, '0'))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
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

/**
 * Read the session cookie, use the refresh token to obtain a fresh access token.
 * Returns the access token string, or null if the session is missing/invalid.
 */
async function getAccessToken(req) {
  const SESSION_SECRET = Netlify.env.get('SESSION_SECRET')
  const CLIENT_ID = Netlify.env.get('GOOGLE_CLIENT_ID')
  const CLIENT_SECRET = Netlify.env.get('GOOGLE_CLIENT_SECRET')

  if (!SESSION_SECRET || !CLIENT_ID || !CLIENT_SECRET) return null

  const sessionStr = await getSessionFromCookie(req, SESSION_SECRET)
  if (!sessionStr) return null

  let session
  try {
    session = JSON.parse(sessionStr)
  } catch {
    return null
  }

  if (!session.refresh_token) return null

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
  return res.ok && data.access_token ? data.access_token : null
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req) {
  const corsHeaders = {
    'access-control-allow-origin': req.headers.get('origin') || '*',
    'access-control-allow-credentials': 'true',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    })
  }

  const accessToken = await getAccessToken(req)
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    })
  }

  const url = new URL(req.url)
  // Strip the /api/calendar prefix to get the resource path
  const path = url.pathname.replace(/^\/api\/calendar/, '')

  const gcalBase = 'https://www.googleapis.com/calendar/v3'
  let upstream

  // GET /api/calendar/list
  if (req.method === 'GET' && path === '/list') {
    upstream = await fetch(`${gcalBase}/users/me/calendarList`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })

  // GET /api/calendar/events
  } else if (req.method === 'GET' && path === '/events') {
    const calendarId = url.searchParams.get('calendarId')
    if (!calendarId) {
      return new Response(JSON.stringify({ error: 'calendarId is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }
    const qs = url.searchParams.toString()
    upstream = await fetch(
      `${gcalBase}/calendars/${encodeURIComponent(calendarId)}/events?${qs}`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    )

  // POST /api/calendar/events — create event
  } else if (req.method === 'POST' && path === '/events') {
    let body
    try { body = await req.json() } catch { body = {} }
    if (!body.calendarId || !body.event) {
      return new Response(JSON.stringify({ error: 'calendarId and event are required' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }
    upstream = await fetch(
      `${gcalBase}/calendars/${encodeURIComponent(body.calendarId)}/events`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(body.event),
      }
    )

  // PATCH /api/calendar/events/:eventId — update event
  } else if (req.method === 'PATCH' && path.startsWith('/events/')) {
    const eventId = path.slice('/events/'.length)
    let body
    try { body = await req.json() } catch { body = {} }
    if (!body.calendarId || !body.patch) {
      return new Response(JSON.stringify({ error: 'calendarId and patch are required' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }
    upstream = await fetch(
      `${gcalBase}/calendars/${encodeURIComponent(body.calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(body.patch),
      }
    )

  // DELETE /api/calendar/events/:eventId — delete event
  } else if (req.method === 'DELETE' && path.startsWith('/events/')) {
    const eventId = path.slice('/events/'.length)
    const calendarId = url.searchParams.get('calendarId')
    if (!calendarId) {
      return new Response(JSON.stringify({ error: 'calendarId is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      })
    }
    upstream = await fetch(
      `${gcalBase}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${accessToken}` },
      }
    )

  } else {
    return new Response('Not Found', { status: 404 })
  }

  // Pass through the upstream response
  // For 204 No Content (e.g. DELETE), return an empty body rather than null
  if (upstream.status === 204) {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  })
}

export const config = {
  path: ['/api/calendar/list', '/api/calendar/events', '/api/calendar/events/*'],
}
