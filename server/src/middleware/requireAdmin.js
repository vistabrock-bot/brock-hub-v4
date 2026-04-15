'use strict'

const config = require('../config')

/**
 * requireAdmin middleware
 *
 * Must be used AFTER requireAuth so that req.user is already populated.
 *
 * An admin is any authenticated user whose email is listed in the
 * ADMIN_EMAILS environment variable or whose Supabase app_metadata
 * contains `{ role: 'admin' }`.
 *
 * Responds with 403 if the user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  const email = (req.user.email || '').toLowerCase()
  const metaRole = req.user.app_metadata?.role

  const isAdmin =
    metaRole === 'admin' ||
    (config.adminEmails.length > 0 && config.adminEmails.includes(email))

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' })
  }

  next()
}

module.exports = { requireAdmin }
