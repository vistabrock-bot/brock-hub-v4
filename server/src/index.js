'use strict'

require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const config = require('./config')

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth')
const inviteRoutes = require('./routes/invite')
const anthropicRoutes = require('./routes/anthropic')
const plannerRoutes = require('./routes/planner')

const app = express()

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet())

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman) in development
      if (!origin || config.allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error(`Origin "${origin}" is not allowed by CORS policy.`))
    },
    credentials: true,
  })
)

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

// ─── Global rate limiter ─────────────────────────────────────────────────────
// 100 requests per 15 minutes per IP across all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use(globalLimiter)

// Stricter limiter for AI endpoints (they're expensive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded. Please wait a moment and try again.' },
})

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/invite', inviteRoutes)
app.use('/api/anthropic', aiLimiter, anthropicRoutes)
app.use('/api/planner', aiLimiter, plannerRoutes)

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }))

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error.' })
})

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`[server] Brock Hub API listening on http://localhost:${config.port}`)
})

module.exports = app // exported for testing
