'use strict'

/**
 * Admin User Management routes — /api/admin
 *
 * All routes require both authentication AND admin role.
 *
 * Admin status is determined by:
 *   1. The user's email is listed in the ADMIN_EMAILS env var, OR
 *   2. The user's Supabase app_metadata.role === 'admin'
 *
 * Routes:
 *   GET    /api/admin/users            — list all users (supports search/filter)
 *   POST   /api/admin/users            — create a new user
 *   PATCH  /api/admin/users/:id        — update a user's metadata / role
 *   DELETE /api/admin/users/:id/gcal   — disconnect a user's Google Calendar
 */

const { Router } = require('express')
const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')

const router = Router()

// Apply requireAuth + requireAdmin to all routes in this router
router.use(requireAuth, requireAdmin)

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Query params:
//   ?search=<string>  — filter by email or full name (case-insensitive)
//   ?status=connected|disconnected  — filter by Google Calendar status
//   ?page=<n>         — 1-based page number (default 1)
//   ?perPage=<n>      — results per page (default 20, max 100)
router.get('/users', async (req, res) => {
  const { search = '', status = '', page = '1', perPage = '20' } = req.query

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(perPage, 10) || 20))
  const offset = (pageNum - 1) * limit

  // Fetch all users from Supabase auth admin API
  const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({
    page: pageNum,
    perPage: limit,
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  let users = usersPage.users || []

  // Apply search filter (client-side after fetch since Supabase admin API
  // doesn't support full-text search on users)
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    users = users.filter((u) => {
      const email = (u.email || '').toLowerCase()
      const name = (u.user_metadata?.full_name || '').toLowerCase()
      return email.includes(q) || name.includes(q)
    })
  }

  // Fetch Google Calendar connection status for visible users
  const userIds = users.map((u) => u.id)
  let gcalMap = {}
  if (userIds.length > 0) {
    const { data: gcalRows } = await supabaseAdmin
      .from('google_calendar_tokens')
      .select('user_id, connected_at')
      .in('user_id', userIds)

    if (gcalRows) {
      gcalRows.forEach((row) => {
        gcalMap[row.user_id] = row.connected_at
      })
    }
  }

  // Build response objects
  let enriched = users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.user_metadata?.full_name || '',
    role: u.app_metadata?.role || 'user',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at,
    gcal: {
      connected: !!gcalMap[u.id],
      connectedAt: gcalMap[u.id] || null,
    },
  }))

  // Apply gcal status filter
  if (status === 'connected') {
    enriched = enriched.filter((u) => u.gcal.connected)
  } else if (status === 'disconnected') {
    enriched = enriched.filter((u) => !u.gcal.connected)
  }

  return res.status(200).json({
    users: enriched,
    total: enriched.length,
    page: pageNum,
    perPage: limit,
  })
})

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Body: { email, password, fullName?, role? }
router.post('/users', async (req, res) => {
  const { email, password, fullName = '', role = 'user' } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' })
  }

  const validRoles = ['user', 'admin']
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}.` })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.full_name || '',
      role: data.user.app_metadata?.role || 'user',
    },
  })
})

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────
// Body: { fullName?, role?, email? }
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params
  const { fullName, role, email } = req.body || {}

  if (role !== undefined) {
    const validRoles = ['user', 'admin']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}.` })
    }
  }

  // Build update payload
  const updatePayload = {}
  if (email !== undefined) updatePayload.email = email
  if (fullName !== undefined) {
    updatePayload.user_metadata = { full_name: fullName }
  }
  if (role !== undefined) {
    updatePayload.app_metadata = { role }
  }

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' })
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({
    message: 'User updated successfully.',
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.full_name || '',
      role: data.user.app_metadata?.role || 'user',
    },
  })
})

// ─── DELETE /api/admin/users/:id/gcal ────────────────────────────────────────
// Admin forcibly disconnects a user's Google Calendar (no token revocation —
// the token may already be expired; the important thing is removing our stored copy).
router.delete('/users/:id/gcal', async (req, res) => {
  const { id } = req.params

  // Confirm the user exists
  const { error: userError } = await supabaseAdmin.auth.admin.getUserById(id)
  if (userError) {
    return res.status(404).json({ error: 'User not found.' })
  }

  const { data: tokenRow, error: lookupError } = await supabaseAdmin
    .from('google_calendar_tokens')
    .select('user_id')
    .eq('user_id', id)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (!tokenRow) {
    return res.status(404).json({ error: 'No Google Calendar connection found for this user.' })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', id)

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message })
  }

  return res.status(200).json({ message: 'Google Calendar disconnected for user.' })
})

module.exports = router
