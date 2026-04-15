import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
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
  sky:       '#7BA3BE',
  skyBg:     'rgba(123,163,190,0.08)',
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

// ─── Edit User Modal ─────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }) {
  const [fullName, setFullName] = useState(user.fullName || '')
  const [email, setEmail] = useState(user.email || '')
  const [role, setRole] = useState(user.role || 'user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const s = {
    input: {
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '9px 13px', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem',
      color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box',
    },
    label: {
      fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
      color: C.muted, fontWeight: 700, marginBottom: 4, display: 'block',
    },
    btn: (color = C.sage) => ({
      padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif", fontSize: '0.75rem', fontWeight: 700,
      background: color, color: '#fff', transition: 'all 0.15s',
    }),
  }

  async function handleSave() {
    setSaving(true); setError(null)
    const payload = {}
    if (fullName !== user.fullName) payload.fullName = fullName
    if (email !== user.email) payload.email = email
    if (role !== user.role) payload.role = role

    if (Object.keys(payload).length === 0) { onClose(); return }

    const { ok, data } = await apiFetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    if (ok) {
      onSave(data.user)
    } else {
      setError(data.error || 'Failed to update user.')
    }
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: C.panel, borderRadius: 16, padding: 28, width: 420, boxShadow: C.shadowLg }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', marginBottom: 20 }}>
          Edit <span style={{ color: C.sage }}>User</span>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: C.roseBg, color: C.rose, fontSize: '0.75rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={s.label}>Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={s.input} />
          </div>
          <div>
            <label style={s.label}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...s.input, cursor: 'pointer' }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...s.btn(C.muted) }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...s.btn(), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add User Modal ───────────────────────────────────────────────
function AddUserModal({ onClose, onAdd }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const s = {
    input: {
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '9px 13px', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem',
      color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box',
    },
    label: {
      fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
      color: C.muted, fontWeight: 700, marginBottom: 4, display: 'block',
    },
    btn: (color = C.sage) => ({
      padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif", fontSize: '0.75rem', fontWeight: 700,
      background: color, color: '#fff', transition: 'all 0.15s',
    }),
  }

  async function handleAdd() {
    if (!email || !password) { setError('Email and password are required.'); return }
    setSaving(true); setError(null)

    const { ok, data } = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    })

    if (ok) {
      onAdd(data.user)
    } else {
      setError(data.error || 'Failed to create user.')
    }
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: C.panel, borderRadius: 16, padding: 28, width: 420, boxShadow: C.shadowLg }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', marginBottom: 20 }}>
          Add <span style={{ color: C.sage }}>User</span>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: C.roseBg, color: C.rose, fontSize: '0.75rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={s.label}>Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} style={s.input} placeholder="Optional" />
          </div>
          <div>
            <label style={s.label}>Email *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={s.input} required />
          </div>
          <div>
            <label style={s.label}>Password *</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" style={s.input} required />
          </div>
          <div>
            <label style={s.label}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...s.input, cursor: 'pointer' }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...s.btn(C.muted) }}>Cancel</button>
          <button onClick={handleAdd} disabled={saving} style={{ ...s.btn(), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')  // '' | 'connected' | 'disconnected'

  const [editingUser, setEditingUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)     // { type, text }

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null)
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (statusFilter) params.set('status', statusFilter)

    const { ok, status, data } = await apiFetch(`/api/admin/users?${params}`)

    if (status === 401) { router.replace('/'); return }
    if (status === 403) { setError('You do not have admin access.'); setLoading(false); return }
    if (!ok) { setError(data.error || 'Failed to load users.'); setLoading(false); return }

    setUsers(data.users || [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Disconnect a user's Google Calendar (admin action)
  async function adminDisconnectGCal(userId) {
    if (!confirm('Disconnect this user\'s Google Calendar?')) return
    const { ok, data } = await apiFetch(`/api/admin/users/${userId}/gcal`, { method: 'DELETE' })
    if (ok) {
      setActionMsg({ type: 'success', text: 'Google Calendar disconnected for user.' })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, gcal: { connected: false, connectedAt: null } } : u))
    } else {
      setActionMsg({ type: 'error', text: data.error || 'Failed to disconnect.' })
    }
  }

  // ─── Styles ────────────────────────────────────────────────────
  const s = {
    card: (extra = {}) => ({
      background: C.panel, borderRadius: 14, padding: '16px 20px',
      border: `1px solid ${C.border}`, boxShadow: C.shadow, ...extra,
    }),
    btn: (color = C.sage, extra = {}) => ({
      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif", fontSize: '0.7rem', fontWeight: 700,
      background: color, color: '#fff', transition: 'all 0.15s', ...extra,
    }),
    outlineBtn: (color = C.muted) => ({
      padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${color}`, cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif", fontSize: '0.65rem', fontWeight: 700,
      background: 'transparent', color: color, transition: 'all 0.15s',
    }),
    pill: (active, color = C.sage) => ({
      padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? color : C.border}`,
      cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: '0.65rem', fontWeight: 600,
      background: active ? color + '18' : 'transparent', color: active ? color : C.muted,
      transition: 'all 0.15s',
    }),
    input: {
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '9px 14px', fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem',
      color: C.text, outline: 'none',
    },
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard — Brock Family Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
            setEditingUser(null)
            setActionMsg({ type: 'success', text: `User ${updated.email} updated.` })
          }}
        />
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newUser) => {
            setUsers(prev => [...prev, { ...newUser, gcal: { connected: false, connectedAt: null } }])
            setShowAddModal(false)
            setActionMsg({ type: 'success', text: `User ${newUser.email} created successfully.` })
          }}
        />
      )}

      <div style={{ fontFamily: "'Outfit', sans-serif", background: C.bg, minHeight: '100vh', color: C.text }}>

        {/* ── TOP BAR ──────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', background: C.panel, borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.15rem', color: C.text }}>
                Brock <span style={{ color: C.sage }}>Family</span> Hub
              </span>
            </a>
            <span style={{ fontSize: '0.52rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim }}>
              Admin Dashboard
            </span>
          </div>
          <a href="/" style={{ ...s.outlineBtn(C.muted), textDecoration: 'none', padding: '7px 16px' }}>← Home</a>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', fontWeight: 400, margin: 0 }}>
                User <span style={{ color: C.sage }}>Management</span>
              </h1>
              <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: 6 }}>
                {users.length} user{users.length !== 1 ? 's' : ''} · Manage accounts, roles, and Google Calendar connections
              </p>
            </div>
            <button onClick={() => setShowAddModal(true)} style={s.btn()}>
              + Add User
            </button>
          </div>

          {/* Action message */}
          {actionMsg && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 16,
              background: actionMsg.type === 'success' ? C.sageBg : C.roseBg,
              border: `1px solid ${actionMsg.type === 'success' ? C.sage + '44' : C.rose + '44'}`,
              color: actionMsg.type === 'success' ? C.sage : C.rose,
              fontSize: '0.78rem', fontWeight: 600,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              {actionMsg.text}
              <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.9rem' }}>✕</button>
            </div>
          )}

          {/* Search + filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ ...s.input, minWidth: 240, flex: 1 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'All', value: '' },
                { label: '📅 Connected', value: 'connected' },
                { label: '⬜ Disconnected', value: 'disconnected' },
              ].map(f => (
                <button
                  key={f.value}
                  style={s.pill(statusFilter === f.value)}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div style={{ padding: '16px', borderRadius: 10, background: C.roseBg, color: C.rose, fontSize: '0.8rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ color: C.muted, fontSize: '0.78rem', padding: '24px 0' }}>Loading users…</div>
          )}

          {/* Users table */}
          {!loading && !error && (
            <div style={s.card({ padding: 0, overflow: 'hidden' })}>
              {users.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
                  No users found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {['Name / Email', 'Role', 'Google Calendar', 'Last Sign-In', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '12px 16px', textAlign: 'left', fontSize: '0.58rem',
                          letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 700,
                          borderBottom: `1px solid ${C.border}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} style={{
                        borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none',
                        transition: 'background 0.12s',
                      }}>
                        {/* Name / Email */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {user.fullName || <span style={{ color: C.dim }}>No name</span>}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: 2 }}>{user.email}</div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            padding: '3px 10px', borderRadius: 8,
                            background: user.role === 'admin' ? C.stoneBg || C.stone + '15' : C.sageBg,
                            color: user.role === 'admin' ? C.stone : C.sage,
                          }}>
                            {user.role}
                          </span>
                        </td>

                        {/* Google Calendar */}
                        <td style={{ padding: '14px 16px' }}>
                          {user.gcal.connected ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.7rem', color: C.sage, fontWeight: 700 }}>✅ Connected</span>
                              {user.gcal.connectedAt && (
                                <span style={{ fontSize: '0.6rem', color: C.muted }}>
                                  {new Date(user.gcal.connectedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: C.dim }}>— Not connected</span>
                          )}
                        </td>

                        {/* Last Sign-In */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.7rem', color: C.muted }}>
                            {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setEditingUser(user)}
                              style={s.outlineBtn(C.sky)}
                            >
                              ✏️ Edit
                            </button>
                            {user.gcal.connected && (
                              <button
                                onClick={() => adminDisconnectGCal(user.id)}
                                style={s.outlineBtn(C.rose)}
                              >
                                🔌 Disconnect Cal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
