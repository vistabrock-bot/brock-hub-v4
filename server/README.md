# Brock Hub — Server

Node.js/Express backend for the Brock Family Hub app.
Provides user authentication (via Supabase), an invitation system, Google Calendar OAuth integration, admin user management, and a secure proxy to the Anthropic AI API.

---

## Features

| Route | Description |
|---|---|
| `POST /api/auth/register` | Create a new user account |
| `POST /api/auth/login` | Sign in, receive JWT tokens |
| `POST /api/auth/logout` | Revoke the current session |
| `GET  /api/auth/me` | Return the authenticated user's profile |
| `POST /api/auth/refresh` | Refresh an expired access token |
| `POST /api/invite/send` | Send an invitation link to an email address |
| `GET  /api/invite/validate?token=` | Validate an invitation token (used during sign-up) |
| `POST /api/invite/accept` | Accept an invitation and create the new account |
| `GET  /api/invite/list` | List all invitations sent by the logged-in user |
| `POST /api/anthropic/messages` | Secure Anthropic Messages API proxy |
| `POST /api/planner/summer` | AI-powered summer camp planner |
| `GET  /api/gcal/auth` | Initiate Google Calendar OAuth flow — returns `{ authUrl }` |
| `GET  /api/gcal/callback` | OAuth callback — stores tokens, redirects to frontend |
| `GET  /api/gcal/status` | Return Google Calendar connection status for current user |
| `DELETE /api/gcal/disconnect` | Revoke and delete the current user's Google Calendar tokens |
| `GET  /api/admin/users` | (Admin) List all users with search/filter and gcal status |
| `POST /api/admin/users` | (Admin) Create a new user |
| `PATCH /api/admin/users/:id` | (Admin) Update a user's name, email, or role |
| `DELETE /api/admin/users/:id/gcal` | (Admin) Disconnect a user's Google Calendar |
| `GET  /health` | Health-check endpoint |

All `/api/auth/*`, `/api/gcal/*`, `/api/anthropic/*`, and `/api/planner/*` routes require authentication.  
All `/api/admin/*` routes additionally require admin role (`app_metadata.role === 'admin'` or listed in `ADMIN_EMAILS`).

---

## Prerequisites

- **Node.js ≥ 18**
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key
- A [Google Cloud Console](https://console.cloud.google.com) project with Calendar API enabled (for gcal features)

---

## Supabase Setup

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Run [`migrations/001_create_invitations.sql`](migrations/001_create_invitations.sql) to create the invitations table.
3. Run [`migrations/002_gcal_and_roles.sql`](migrations/002_gcal_and_roles.sql) to create the `google_calendar_tokens` table.

---

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Add an **Authorized redirect URI**:
   - Development: `http://localhost:4000/api/gcal/callback`
   - Production: `https://your-api.onrender.com/api/gcal/callback`
4. Enable the **Google Calendar API** in **APIs & Services → Library**.
5. Copy the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into your `.env` file.

---

## Admin Setup

Admins are identified in two ways:

1. **`ADMIN_EMAILS`** env var — a comma-separated list of email addresses that always have admin access.
2. **`app_metadata.role`** — set `"admin"` on a user via the Supabase dashboard (Auth → Users → edit user → app_metadata).

---

## Local Development

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your real credentials
```

### 3. Start the development server

```bash
npm run dev   # uses nodemon for auto-reload
# or
npm start
```

### 4. Run tests

```bash
npm test
```

The API will be available at `http://localhost:4000`.

---

## API Quick Reference

### Connect Google Calendar (user flow)

```js
// 1. Get the auth URL (requires Bearer token)
const { authUrl } = await fetch(`${API}/api/gcal/auth`, {
  headers: { Authorization: `Bearer ${accessToken}` }
}).then(r => r.json())

// 2. Redirect the user's browser to authUrl
window.location.href = authUrl

// 3. Google redirects to GOOGLE_REDIRECT_URI (the Express server)
//    The server stores the tokens and redirects to:
//    ${APP_BASE_URL}/profile?gcal=connected
```

### Check gcal status

```js
const { connected, connectedAt } = await fetch(`${API}/api/gcal/status`, {
  headers: { Authorization: `Bearer ${accessToken}` }
}).then(r => r.json())
```

### Admin: list users

```js
const { users } = await fetch(`${API}/api/admin/users?search=alice&status=connected`, {
  headers: { Authorization: `Bearer ${adminAccessToken}` }
}).then(r => r.json())
```

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_STATE_SECRET` are **server-only** secrets. Never commit them to source control.
- Google Calendar tokens are stored in Supabase with Row-Level Security — only the owning user can read their own row via the anon client.
- The OAuth `state` parameter is HMAC-signed to prevent CSRF attacks. It expires after 10 minutes.
- Admin routes return 403 for non-admin users; 401 for unauthenticated requests.
- Rate limiting: 100 req/15 min globally; stricter on AI endpoints (20 req/min).
- CORS is restricted to the origins listed in `ALLOWED_ORIGINS`.

---

## Prerequisites

- **Node.js ≥ 18**
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key

---

## Supabase Setup

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Copy-paste the contents of [`migrations/001_create_invitations.sql`](migrations/001_create_invitations.sql) and click **Run**.

That migration creates the `invitations` table and enables Row-Level Security so users can only see their own sent invitations. The server's service-role key bypasses RLS for inserts and updates.

---

## Local Development

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your real Supabase and Anthropic credentials
```

### 3. Start the development server

```bash
npm run dev   # uses nodemon for auto-reload
# or
npm start
```

The API will be available at `http://localhost:4000`.

---

## API Quick Reference

### Register a user

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"s3cr3t!","fullName":"Your Name"}'
```

### Log in

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"s3cr3t!"}'
# Returns { accessToken, refreshToken, expiresAt, user }
```

### Invite someone (e.g. Tanya)

```bash
curl -X POST http://localhost:4000/api/invite/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"email":"tanya@example.com"}'
# Returns { inviteUrl: "http://localhost:3000/signup?token=<uuid>" }
```

### Accept an invitation

```bash
# 1. Validate the token (returns the pre-filled email)
curl "http://localhost:4000/api/invite/validate?token=<uuid>"

# 2. Create the account
curl -X POST http://localhost:4000/api/invite/accept \
  -H "Content-Type: application/json" \
  -d '{"token":"<uuid>","password":"mynewpassword","fullName":"Tanya"}'
```

### Call Anthropic (chat)

```bash
curl -X POST http://localhost:4000/api/anthropic/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "system": "You are a helpful family assistant.",
    "messages": [{"role":"user","content":"What camps are good for a 4-year-old?"}]
  }'
```

### Summer planner

```bash
curl -X POST http://localhost:4000/api/planner/summer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "hoursOutPerDay": 6,
    "totalBudget": 3000,
    "maxCommuteMinutes": 25,
    "startDate": "2025-06-01",
    "endDate": "2025-08-15",
    "children": [
      {"name":"Monroe","ageYears":4},
      {"name":"Genevieve","ageYears":3}
    ],
    "camps": [
      {
        "name": "Austin Discovery Camp",
        "costPerWeek": 350,
        "hoursPerDay": 8,
        "commuteMinutes": 15,
        "ageMin": 3,
        "ageMax": 10,
        "availableWeeks": [1,2,3,4,5,6,7,8,9,10,11]
      }
    ]
  }'
```

---

## Production Deployment

### Option A — Render / Railway / Fly.io

1. Push the monorepo (or just the `/server` folder) to your host.
2. Set **Root Directory** to `server` in your host's settings.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Add all environment variables from `.env.example` in the host's dashboard.
6. Update `ALLOWED_ORIGINS` to include your Netlify frontend URL.
7. Update `APP_BASE_URL` to your production frontend URL so invite links are correct.

### Option B — Netlify Functions (serverless)

The Next.js frontend already uses Netlify Functions via `pages/api/`.
If you prefer to keep everything serverless, you can migrate the Express routes
into individual files under `pages/api/` in the frontend. The `/server` Express
backend is designed for a long-running process deployment.

---

## Connecting the Frontend

### 1. Create the frontend environment file

```bash
# from the repo root
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_BASE_URL to http://localhost:4000 for local dev
```

### 2. Use `NEXT_PUBLIC_API_BASE_URL` in fetch calls

Any page or component that needs the backend should read the base URL from the
environment variable (available at build time and runtime via Next.js):

```js
const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
```

### 3. Auth flow (login / register)

```js
// Register
const res = await fetch(`${API}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, fullName }),
})

// Login — store the returned accessToken in state / localStorage
const { accessToken, user } = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
}).then(r => r.json())
```

### 4. Replace the existing `/api/ai` calls with the server proxy

The current `pages/api/ai.js` Next.js route proxies directly to Anthropic.
Once the server is running, swap those calls to go through the server instead
(which adds authentication and rate-limiting):

```js
// Before (pages/api/ai — no auth)
const res = await fetch('/api/ai', { method: 'POST', ... })

// After (Express server — requires Bearer token)
const res = await fetch(`${API}/api/anthropic/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ system, messages }),
})
```

### 5. Planner AI

```js
const res = await fetch(`${API}/api/planner/summer`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    hoursOutPerDay: 6,
    totalBudget: 3000,
    maxCommuteMinutes: 25,
    startDate: '2026-06-01',
    endDate: '2026-08-14',
    children: [
      { name: 'Monroe',    ageYears: 5 },
      { name: 'Genevieve', ageYears: 3 },
    ],
    camps: [/* your CAMPS array from pages/index.js */],
  }),
})
const { plan } = await res.json()
// `plan` is the AI-generated week-by-week text schedule
```

### 6. Invite a user (e.g. Tanya)

```js
const res = await fetch(`${API}/api/invite/send`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ email: 'tanya@example.com' }),
})
const { inviteUrl } = await res.json()
// Share inviteUrl with Tanya — it contains a unique sign-up token
```

### Production

Set `NEXT_PUBLIC_API_BASE_URL` to your deployed server URL (Render, Railway, etc.)
in your Netlify dashboard under **Site settings → Environment variables**.

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are **server-only** secrets.  
  Never commit them to source control and never expose them to the browser.
- Rate limiting is applied globally (100 req/15 min) and stricter on AI endpoints (20 req/min).
- CORS is restricted to the origins listed in `ALLOWED_ORIGINS`.
- Helmet sets secure HTTP headers on all responses.
