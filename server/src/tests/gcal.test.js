'use strict'

/**
 * Tests for Google Calendar OAuth routes — /api/gcal
 *
 * All Supabase calls and Google OAuth calls are mocked so these tests
 * run without real credentials.
 */

// ─── Mock external dependencies before requiring routes ──────────────────────

// Mock supabase
const mockMaybeSingle = jest.fn()
const mockUpsert = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockFrom = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: mockFrom,
    auth: {
      getUser: jest.fn(),
    },
  },
  supabaseAnon: {},
}))

// Mock google-auth-library
const mockGenerateAuthUrl = jest.fn()
const mockGetToken = jest.fn()
const mockRevokeToken = jest.fn()

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    revokeToken: mockRevokeToken,
  })),
}))

// Mock config
jest.mock('../config', () => ({
  google: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:4000/api/gcal/callback',
    scopes: ['https://www.googleapis.com/auth/calendar'],
    stateSecret: 'test-state-secret',
  },
  appBaseUrl: 'http://localhost:3000',
  allowedOrigins: ['http://localhost:3000'],
  port: 4000,
  supabase: { url: '', serviceRoleKey: '', anonKey: '' },
  anthropic: { apiKey: '', defaultModel: '', defaultMaxTokens: 1200 },
  adminEmails: [],
}))

// Mock requireAuth middleware so tests bypass Supabase token validation
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com' }
    next()
  },
}))

const request = require('supertest')
const express = require('express')
const gcalRoutes = require('../routes/gcal')

// ─── Build a minimal test app ─────────────────────────────────────────────────
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/gcal', gcalRoutes)
  return app
}

// ─── Helpers to build a valid HMAC state ─────────────────────────────────────
const crypto = require('crypto')
function makeState(userId, secret = 'test-state-secret', ageOffsetMs = 0) {
  const timestamp = Date.now() + ageOffsetMs
  const payload = `${userId}.${timestamp}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/gcal/auth', () => {
  it('returns an authUrl', async () => {
    mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...')

    const res = await request(buildApp()).get('/api/gcal/auth')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('authUrl')
    expect(typeof res.body.authUrl).toBe('string')
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: 'offline', prompt: 'consent' })
    )
  })
})

describe('GET /api/gcal/callback', () => {
  const userId = 'user-123'

  beforeEach(() => {
    mockGetToken.mockReset()
    mockFrom.mockReset()
  })

  it('redirects to profile?gcal=connected on success', async () => {
    const state = makeState(userId)
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/calendar',
      },
    })

    // Mock upsert success
    mockFrom.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })

    const res = await request(buildApp())
      .get(`/api/gcal/callback?code=auth-code&state=${state}`)

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:3000/profile?gcal=connected')
  })

  it('redirects with error when oauthError is present', async () => {
    const res = await request(buildApp())
      .get('/api/gcal/callback?error=access_denied&state=anything')

    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('gcal=error')
    expect(res.headers.location).toContain('access_denied')
  })

  it('redirects with error when state is missing', async () => {
    const res = await request(buildApp()).get('/api/gcal/callback?code=some-code')

    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('gcal=error')
  })

  it('redirects with invalid_state when state is tampered', async () => {
    const tamperedState = makeState(userId, 'wrong-secret')

    const res = await request(buildApp())
      .get(`/api/gcal/callback?code=some-code&state=${tamperedState}`)

    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('invalid_state')
  })

  it('redirects with error when token exchange fails', async () => {
    const state = makeState(userId)
    mockGetToken.mockRejectedValue(new Error('invalid_grant'))
    mockFrom.mockReturnValue({ upsert: jest.fn() })

    const res = await request(buildApp())
      .get(`/api/gcal/callback?code=bad-code&state=${state}`)

    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('token_exchange_failed')
  })
})

describe('GET /api/gcal/status', () => {
  beforeEach(() => mockFrom.mockReset())

  it('returns connected:true when token row exists', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { connected_at: '2025-01-01T00:00:00Z', scope: 'calendar', token_expiry: null },
            error: null,
          }),
        }),
      }),
    })

    const res = await request(buildApp()).get('/api/gcal/status')

    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(true)
    expect(res.body).toHaveProperty('connectedAt')
  })

  it('returns connected:false when no token row', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const res = await request(buildApp()).get('/api/gcal/status')

    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(false)
  })
})

describe('DELETE /api/gcal/disconnect', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockRevokeToken.mockReset()
  })

  it('disconnects successfully', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: select tokens
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { access_token: 'at', refresh_token: 'rt' },
                error: null,
              }),
            }),
          }),
        }
      }
      // Second call: delete
      return {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    mockRevokeToken.mockResolvedValue({})

    const res = await request(buildApp()).delete('/api/gcal/disconnect')

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/disconnected/i)
  })

  it('returns 404 when no token exists', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const res = await request(buildApp()).delete('/api/gcal/disconnect')

    expect(res.status).toBe(404)
  })
})

