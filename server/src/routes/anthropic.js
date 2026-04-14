'use strict'

/**
 * Anthropic Proxy — /api/anthropic
 *
 * Forwards requests to the Anthropic Messages API.
 * The API key is loaded from the ANTHROPIC_API_KEY environment variable
 * and is never sent to the browser.
 *
 * All requests must be authenticated (requireAuth).
 */

const { Router } = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const { requireAuth } = require('../middleware/auth')
const config = require('../config')

const router = Router()

// Lazily initialise the Anthropic client so startup doesn't fail when the key
// is not yet configured (it will still 500 at request time with a clear message).
let _client = null
function getClient() {
  if (!_client) {
    if (!config.anthropic.apiKey) {
      return null
    }
    _client = new Anthropic({ apiKey: config.anthropic.apiKey })
  }
  return _client
}

// ─── POST /api/anthropic/messages ────────────────────────────────────────────
// Body: { messages, system?, model?, max_tokens? }
// Proxies to https://api.anthropic.com/v1/messages
router.post('/messages', requireAuth, async (req, res) => {
  const client = getClient()
  if (!client) {
    return res.status(503).json({
      error: 'AI is not configured. Set ANTHROPIC_API_KEY in the server environment variables.',
    })
  }

  const { messages, system, model, max_tokens } = req.body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' })
  }

  try {
    const response = await client.messages.create({
      model: model || config.anthropic.defaultModel,
      max_tokens: max_tokens || config.anthropic.defaultMaxTokens,
      system: system || undefined,
      messages,
    })

    return res.status(200).json(response)
  } catch (err) {
    const status = err.status || 500
    const message = err.message || 'Unknown Anthropic API error.'
    return res.status(status).json({ error: message })
  }
})

module.exports = router
