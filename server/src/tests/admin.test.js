'use strict'

/**
 * Tests for Admin User Management routes — /api/admin
 *
 * All Supabase calls are mocked so these tests run without real credentials.
 */

// ─── Mock external dependencies ──────────────────────────────────────────────

jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
      admin: {
        listUsers: jest.fn(),
        createUser: jest.fn(),
        updateUserById: jest.fn(),
        getUserById: jest.fn(),
      },
    },
    from: jest.fn(),
  },
  supabaseAnon: {},
}))

jest.mock('../config', () => ({
  google: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:4000/api/gcal/callback',
    scopes: [],
    stateSecret: 'secret',
  },
  appBaseUrl: 'http://localhost:3000',
  allowedOrigins: ['http://localhost:3000'],
  port: 4000,
  supabase: { url: '', serviceRoleKey: '', anonKey: '' },
  anthropic: { apiKey: '', defaultModel: '', defaultMaxTokens: 1200 },
  // 'admin@example.com' is an admin via ADMIN_EMAILS
  adminEmails: ['admin@example.com'],
}))

// Mock requireAuth to inject test user from request header 'x-test-user'
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    const header = req.headers['x-test-user']
    if (!header) return res.status(401).json({ error: 'Unauthorized' })
    try {
      req.user = JSON.parse(header)
      next()
    } catch {
      res.status(401).json({ error: 'Unauthorized' })
    }
  },
}))

const request = require('supertest')
const express = require('express')
const adminRoutes = require('../routes/admin')
const { supabaseAdmin } = require('../lib/supabase')

// ─── Build test app ───────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/admin', adminRoutes)
  return app
}

const ADMIN_USER = JSON.stringify({
  id: 'admin-user-id',
  email: 'admin@example.com',
  app_metadata: {},
})

const NON_ADMIN_USER = JSON.stringify({
  id: 'regular-user-id',
  email: 'notadmin@example.com',
  app_metadata: {},
})

const META_ADMIN_USER = JSON.stringify({
  id: 'meta-admin-id',
  email: 'any@x.com',
  app_metadata: { role: 'admin' },
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Admin middleware', () => {
  it('returns 403 for non-admin users', async () => {
    const res = await request(buildApp())
      .get('/api/admin/users')
      .set('x-test-user', NON_ADMIN_USER)
    expect(res.status).toBe(403)
  })

  it('returns 401 when no auth is provided', async () => {
    const res = await request(buildApp()).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('allows users with app_metadata.role === admin', async () => {
    supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] }, error: null,
    })
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const res = await request(buildApp())
      .get('/api/admin/users')
      .set('x-test-user', META_ADMIN_USER)

    expect(res.status).toBe(200)
  })
})

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns a list of users with gcal status', async () => {
    supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: 'u1',
            email: 'alice@example.com',
            user_metadata: { full_name: 'Alice' },
            app_metadata: { role: 'user' },
            created_at: '2025-01-01T00:00:00Z',
            last_sign_in_at: '2025-01-02T00:00:00Z',
          },
          {
            id: 'u2',
            email: 'bob@example.com',
            user_metadata: { full_name: 'Bob' },
            app_metadata: {},
            created_at: '2025-01-01T00:00:00Z',
            last_sign_in_at: null,
          },
        ],
      },
      error: null,
    })

    // Mock gcal token lookup — only u1 is connected
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [{ user_id: 'u1', connected_at: '2025-01-03T00:00:00Z' }],
          error: null,
        }),
      }),
    })

    const res = await request(buildApp())
      .get('/api/admin/users')
      .set('x-test-user', ADMIN_USER)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(2)
    const alice = res.body.users.find((u) => u.id === 'u1')
    const bob = res.body.users.find((u) => u.id === 'u2')
    expect(alice.gcal.connected).toBe(true)
    expect(bob.gcal.connected).toBe(false)
  })

  it('filters by search term', async () => {
    supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'alice@example.com', user_metadata: { full_name: 'Alice' }, app_metadata: {}, created_at: '', last_sign_in_at: null },
          { id: 'u2', email: 'bob@example.com', user_metadata: { full_name: 'Bob' }, app_metadata: {}, created_at: '', last_sign_in_at: null },
        ],
      },
      error: null,
    })
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    })

    const res = await request(buildApp())
      .get('/api/admin/users?search=alice')
      .set('x-test-user', ADMIN_USER)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.users[0].email).toBe('alice@example.com')
  })

  it('filters by gcal status=connected', async () => {
    supabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'u1', email: 'alice@example.com', user_metadata: {}, app_metadata: {}, created_at: '', last_sign_in_at: null },
          { id: 'u2', email: 'bob@example.com', user_metadata: {}, app_metadata: {}, created_at: '', last_sign_in_at: null },
        ],
      },
      error: null,
    })
    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [{ user_id: 'u1', connected_at: '2025-01-01T00:00:00Z' }],
          error: null,
        }),
      }),
    })

    const res = await request(buildApp())
      .get('/api/admin/users?status=connected')
      .set('x-test-user', ADMIN_USER)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.users[0].id).toBe('u1')
  })
})

describe('POST /api/admin/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a user successfully', async () => {
    supabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'new-id',
          email: 'new@example.com',
          user_metadata: { full_name: 'New User' },
          app_metadata: { role: 'user' },
        },
      },
      error: null,
    })

    const res = await request(buildApp())
      .post('/api/admin/users')
      .set('x-test-user', ADMIN_USER)
      .send({ email: 'new@example.com', password: 'Secret123!', fullName: 'New User' })

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('new@example.com')
  })

  it('returns 400 when email is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/users')
      .set('x-test-user', ADMIN_USER)
      .send({ password: 'Secret123!' })

    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    const res = await request(buildApp())
      .post('/api/admin/users')
      .set('x-test-user', ADMIN_USER)
      .send({ email: 'x@x.com', password: 'p', role: 'superuser' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/role/i)
  })
})

describe('PATCH /api/admin/users/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates a user', async () => {
    supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          email: 'alice@example.com',
          user_metadata: { full_name: 'Alice Updated' },
          app_metadata: { role: 'admin' },
        },
      },
      error: null,
    })

    const res = await request(buildApp())
      .patch('/api/admin/users/u1')
      .set('x-test-user', ADMIN_USER)
      .send({ fullName: 'Alice Updated', role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('admin')
  })

  it('returns 400 when no fields are provided', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/users/u1')
      .set('x-test-user', ADMIN_USER)
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/admin/users/:id/gcal', () => {
  beforeEach(() => jest.clearAllMocks())

  it('disconnects a user\'s Google Calendar', async () => {
    supabaseAdmin.auth.admin.getUserById.mockResolvedValue({ error: null })

    let fromCallCount = 0
    supabaseAdmin.from.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { user_id: 'u1' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const res = await request(buildApp())
      .delete('/api/admin/users/u1/gcal')
      .set('x-test-user', ADMIN_USER)

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/disconnected/i)
  })

  it('returns 404 when user has no gcal connection', async () => {
    supabaseAdmin.auth.admin.getUserById.mockResolvedValue({ error: null })

    supabaseAdmin.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const res = await request(buildApp())
      .delete('/api/admin/users/u1/gcal')
      .set('x-test-user', ADMIN_USER)
    expect(res.status).toBe(404)
  })

  it('returns 404 when user does not exist', async () => {
    supabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      error: { message: 'User not found' },
    })

    const res = await request(buildApp())
      .delete('/api/admin/users/nonexistent/gcal')
      .set('x-test-user', ADMIN_USER)
    expect(res.status).toBe(404)
  })
})
