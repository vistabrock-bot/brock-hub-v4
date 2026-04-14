'use strict'

const { supabaseAdmin } = require('../lib/supabase')

/**
 * requireAuth middleware
 *
 * Reads the `Authorization: Bearer <access_token>` header,
 * validates it with Supabase, and attaches `req.user` to the request.
 *
 * Responds with 401 if the token is missing or invalid.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  req.user = data.user
  next()
}

module.exports = { requireAuth }
