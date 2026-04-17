import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// ─── THEME ───────────────────────────────────────────────────────
const C = {
  bg:        '#F7F6F3',
  bgWarm:    '#F0EDE8',
  panel:     '#FFFFFF',
  border:    'rgba(0,0,0,0.07)',
  borderMed: 'rgba(0,0,0,0.12)',
  shadow:    '0 1px 3px rgba(0,0,0,0.04)',
  shadowLg:  '0 4px 12px rgba(0,0,0,0.06)',
  text:      '#2C3338',
  textSoft:  '#555D64',
  muted:     '#8A9199',
  dim:       '#B5BCC3',
  sage:      '#7C9A82',
  sageBg:    'rgba(124,154,130,0.08)',
  stone:     '#C4A882',
  rose:      '#C08B8B',
  roseBg:    'rgba(192,139,139,0.08)',
}

// ─── Storage helpers ─────────────────────────────────────────────
function loadLS(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try { const v = localStorage.getItem(`bfh_${key}`); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}

// ─── API helpers ─────────────────────────────────────────────────
function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
}

async function apiFetch(path, options = {}) {
  const token = loadLS('accessToken', null)
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${apiBase()}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// ─── COMPONENT ───────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [gcalStatus, setGcalStatus] = useState(null)   // null | { connected, connectedAt }
  const [loading, setLoading] = useState(true)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [message, setMessage] = useState(null)          // { type:'success'|'error', text }

  // Check for OAuth callback result in URL params
  useEffect(() => {
    const { gcal, reason } = router.query
    if (gcal === 'connected') {
      setMessage({ type: 'success', text: '✅ Google Calendar connected successfully!' })
      router.replace('/profile', undefined, { shallow: true })
    } else if (gcal === 'error') {
      const msg = reason === 'invalid_state'
        ? 'Security check failed — please try again.'
        : reason === 'token_exchange_failed'
        ? 'Could not exchange authorisation code — please try again.'
        : `Connection failed: ${reason || 'unknown error'}`
      setMessage({ type: 'error', text: `❌ ${msg}` })
      router.replace('/profile', undefined, { shallow: true })
    }
  }, [router.query])

  // Load user & gcal status on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [meRes, gcalRes] = await Promise.all([
        apiFetch('/api/auth/me'),
        apiFetch('/api/gcal/status'),
      ])

      if (meRes.ok) {
        setUser(meRes.data)
      } else {
        // Not authenticated — redirect to home
        router.replace('/')
        return
      }

      if (gcalRes.ok) {
        setGcalStatus(gcalRes.data)
      }

      setLoading(false)
    }
    load()
  }, [])

  // Initiate Google Calendar OAuth flow
  async function connectGCal() {
    setGcalLoading(true)
    setMessage(null)
    const { ok, data } = await apiFetch('/api/gcal/auth')
    if (ok && data.authUrl) {
      window.location.href = data.authUrl
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error || 'Could not start Google Calendar connection.'}` })
      setGcalLoading(false)
    }
  }

  // Disconnect Google Calendar
  async function disconnectGCal() {
    if (!confirm('Are you sure you want to disconnect your Google Calendar?')) return
    setGcalLoading(true)
    setMessage(null)
    const { ok, data } = await apiFetch('/api/gcal/disconnect', { method: 'DELETE' })
    if (ok) {
      setGcalStatus({ connected: false })
      setMessage({ type: 'success', text: '✅ Google Calendar disconnected.' })
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error || 'Failed to disconnect.'}` })
    }
    setGcalLoading(false)
  }

  // ─── Styles ────────────────────────────────────────────────────
  const s = {
    card: (extra = {}) => ({
      background: C.panel,
      borderRadius: 14,
      padding: '20px 24px',
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      ...extra,
    }),
    btn: (color = C.sage, extra = {}) => ({
      padding: '10px 20px',
      borderRadius: 10,
      border: 'none',
      cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif",
      fontSize: '0.78rem',
      fontWeight: 700,
      background: color,
      color: '#fff',
      boxShadow: `0 2px 6px ${color}33`,
      transition: 'all 0.15s',
      ...extra,
    }),
    outlineBtn: (color = C.sage) => ({
      padding: '10px 20px',
      borderRadius: 10,
      border: `1.5px solid ${color}`,
      cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif",
      fontSize: '0.78rem',
      fontWeight: 700,
      background: 'transparent',
      color: color,
      transition: 'all 0.15s',
    }),
    label: {
      fontSize: '0.6rem',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: C.muted,
      fontWeight: 700,
      marginBottom: 4,
    },
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
        Loading…
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>My Profile — Brock Family Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily: "'Outfit', sans-serif", background: C.bg, minHeight: '100vh', color: C.text }}>

        {/* ── TOP BAR ──────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', background: C.panel, borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.15rem', fontWeight: 400, color: C.text }}>
                Brock <span style={{ color: C.sage }}>Family</span> Hub
              </span>
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/" style={{ ...s.outlineBtn(C.muted), textDecoration: 'none', padding: '7px 16px', fontSize: '0.7rem' }}>← Home</a>
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        <div style={{ padding: '32px 24px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Page title */}
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', fontWeight: 400, margin: 0 }}>
              My <span style={{ color: C.sage }}>Profile</span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: 6 }}>
              Manage your account settings and integrations.
            </p>
          </div>

          {/* Flash message */}
          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: message.type === 'success' ? C.sageBg : C.roseBg,
              border: `1px solid ${message.type === 'success' ? C.sage + '44' : C.rose + '44'}`,
              color: message.type === 'success' ? C.sage : C.rose,
              fontSize: '0.8rem',
              fontWeight: 600,
            }}>
              {message.text}
            </div>
          )}

          {/* Account card */}
          <div style={s.card()}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 16 }}>
              Account
            </div>
            {user && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={s.label}>Full Name</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.fullName || '—'}</div>
                </div>
                <div>
                  <div style={s.label}>Email</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.email}</div>
                </div>
                <div>
                  <div style={s.label}>User ID</div>
                  <div style={{ fontSize: '0.7rem', color: C.muted, fontFamily: 'monospace' }}>{user.id}</div>
                </div>
              </div>
            )}
          </div>

          {/* Google Calendar card */}
          <div style={s.card()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 4 }}>
                  Google Calendar
                </div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.2rem' }}>
                  Calendar <span style={{ color: C.sage }}>Integration</span>
                </div>
              </div>
              <span style={{ fontSize: '1.8rem' }}>📅</span>
            </div>

            {gcalStatus?.connected ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  borderRadius: 10, background: C.sageBg, border: `1px solid ${C.sage}33`, marginBottom: 16,
                }}>
                  <span style={{ fontSize: '1rem' }}>✅</span>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.sage }}>Connected</div>
                    {gcalStatus.connectedAt && (
                      <div style={{ fontSize: '0.62rem', color: C.muted }}>
                        Since {new Date(gcalStatus.connectedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.72rem', color: C.textSoft, lineHeight: 1.6, marginBottom: 16 }}>
                  Your Google Calendar is connected. The app can read and create events on your behalf.
                </p>
                <button
                  onClick={disconnectGCal}
                  disabled={gcalLoading}
                  style={{ ...s.outlineBtn(C.rose), opacity: gcalLoading ? 0.5 : 1 }}
                >
                  {gcalLoading ? 'Disconnecting…' : '🔌 Disconnect Google Calendar'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.72rem', color: C.textSoft, lineHeight: 1.6, marginBottom: 16 }}>
                  Connect your Google Calendar to sync events, see your schedule alongside family plans,
                  and let the AI Assistant create calendar events for you.
                </p>
                <ul style={{ fontSize: '0.7rem', color: C.muted, paddingLeft: 20, marginBottom: 16, lineHeight: 1.8 }}>
                  <li>View your calendar events in Planner</li>
                  <li>Auto-add camp registrations to your calendar</li>
                  <li>Shared family event visibility</li>
                </ul>
                <button
                  onClick={connectGCal}
                  disabled={gcalLoading}
                  style={{ ...s.btn(), opacity: gcalLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                  {gcalLoading ? 'Connecting…' : 'Connect Google Calendar'}
                </button>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div style={{ fontSize: '0.62rem', color: C.dim, textAlign: 'center', lineHeight: 1.6 }}>
            Google Calendar tokens are stored securely and only used to read/write your calendar.
            You can disconnect at any time.
          </div>

        </div>
      </div>
    </>
  )
}
