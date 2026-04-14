'use strict'

const { createClient } = require('@supabase/supabase-js')
const config = require('../config')

/**
 * Admin client — uses the service-role key.
 * NEVER expose this client or its key to the browser.
 * Use only in server-side code where elevated access is needed
 * (e.g., creating invitation records, verifying tokens).
 */
const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Anon client — uses the public anon key.
 * Safe to use for operations that go through Row-Level Security (RLS).
 */
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey)

module.exports = { supabaseAdmin, supabaseAnon }
