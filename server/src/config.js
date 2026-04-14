'use strict'

require('dotenv').config()

// ─── Required environment variables ──────────────────────────────────────────
const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'ANTHROPIC_API_KEY',
]

REQUIRED.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[config] WARNING: environment variable "${key}" is not set.`)
  }
})

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),

  // CORS — comma-separated list of allowed origins, e.g.:
  // ALLOWED_ORIGINS=http://localhost:3000,https://brock-family-app.netlify.app
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    defaultMaxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1200', 10),
  },

  // Base URL for invitation links sent via email
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
}
