'use strict'

/**
 * Invite Routes — /api/invite
 *
 * Supabase table required (run once in the Supabase SQL editor):
 *
 *   create table if not exists public.invitations (
 *     id          uuid primary key default gen_random_uuid(),
 *     token       text unique not null,
 *     invited_by  uuid references auth.users(id) on delete set null,
 *     email       text not null,
 *     accepted    boolean not null default false,
 *     created_at  timestamptz not null default now(),
 *     accepted_at timestamptz
 *   );
 *
 *   -- Only the authenticated user who created the invite can see it.
 *   alter table public.invitations enable row level security;
 *   create policy "owner select" on public.invitations
 *     for select using (auth.uid() = invited_by);
 *
 * Note: The admin client bypasses RLS so it can insert and read freely.
 */

const { Router } = require('express')
const { v4: uuidv4 } = require('uuid')
const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')
const config = require('../config')

const router = Router()

// ─── POST /api/invite/send ────────────────────────────────────────────────────
// Requires auth. Body: { email }
// Creates an invitation record and returns the invite link.
router.post('/send', requireAuth, async (req, res) => {
  const { email } = req.body || {}

  if (!email) {
    return res.status(400).json({ error: 'email is required.' })
  }

  // Check if a pending invite for this email already exists
  const { data: existing } = await supabaseAdmin
    .from('invitations')
    .select('id, token')
    .eq('email', email)
    .eq('accepted', false)
    .maybeSingle()

  if (existing) {
    const inviteUrl = `${config.appBaseUrl}/signup?token=${existing.token}`
    return res.status(200).json({
      message: 'A pending invite already exists for this email.',
      inviteUrl,
    })
  }

  const token = uuidv4()

  const { error } = await supabaseAdmin.from('invitations').insert({
    token,
    invited_by: req.user.id,
    email,
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const inviteUrl = `${config.appBaseUrl}/signup?token=${token}`

  return res.status(201).json({
    message: `Invitation created for ${email}.`,
    inviteUrl,
  })
})

// ─── GET /api/invite/validate?token=<token> ───────────────────────────────────
// Public — validates an invite token so the signup form can pre-fill the email.
router.get('/validate', async (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.status(400).json({ error: 'token query parameter is required.' })
  }

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, accepted, invited_by')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) {
    return res.status(404).json({ error: 'Invitation not found or expired.' })
  }

  if (data.accepted) {
    return res.status(410).json({ error: 'This invitation has already been accepted.' })
  }

  return res.status(200).json({ email: data.email })
})

// ─── POST /api/invite/accept ──────────────────────────────────────────────────
// Body: { token, password, fullName? }
// Creates the new user and marks the invitation as accepted.
router.post('/accept', async (req, res) => {
  const { token, password, fullName } = req.body || {}

  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required.' })
  }

  // 1. Look up the invitation
  const { data: invite, error: lookupError } = await supabaseAdmin
    .from('invitations')
    .select('id, email, accepted')
    .eq('token', token)
    .maybeSingle()

  if (lookupError || !invite) {
    return res.status(404).json({ error: 'Invitation not found or expired.' })
  }

  if (invite.accepted) {
    return res.status(410).json({ error: 'This invitation has already been accepted.' })
  }

  // 2. Create the Supabase auth user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || '', invited: true },
  })

  if (createError) {
    return res.status(400).json({ error: createError.message })
  }

  // 3. Mark invitation as accepted
  await supabaseAdmin
    .from('invitations')
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return res.status(201).json({
    message: 'Account created successfully. You can now log in.',
    user: {
      id: userData.user.id,
      email: userData.user.email,
    },
  })
})

// ─── GET /api/invite/list ─────────────────────────────────────────────────────
// Requires auth. Returns all invitations sent by the logged-in user.
router.get('/list', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, accepted, created_at, accepted_at')
    .eq('invited_by', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ invitations: data })
})

module.exports = router
