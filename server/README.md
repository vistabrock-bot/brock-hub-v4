# Brock Hub — Server

Node.js/Express backend for the Brock Family Hub app.
Provides user authentication (via Supabase), an invitation system, and a secure proxy to the Anthropic AI API.

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
| `GET  /health` | Health-check endpoint |

All `/api/anthropic/*` and `/api/planner/*` routes require authentication.
The Anthropic API key is **never** sent to the browser.

---

## Prerequisites

- **Node.js ≥ 18**
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key

---

## Supabase Setup

Run the following SQL once in the **Supabase SQL Editor** (Dashboard → SQL Editor):

```sql
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  invited_by  uuid references auth.users(id) on delete set null,
  email       text not null,
  accepted    boolean not null default false,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

-- Row-level security: owners can only see their own invitations
alter table public.invitations enable row level security;

create policy "owner select" on public.invitations
  for select using (auth.uid() = invited_by);
```

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

The frontend (`pages/index.js`) can talk to this backend by pointing fetch calls at:

```
http://localhost:4000   (local dev)
https://your-api.onrender.com   (production)
```

Store the base URL in the frontend's `.env.local` as:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Then replace calls to `/api/ai` with calls to `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/anthropic/messages`
(adding the `Authorization: Bearer <token>` header).

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are **server-only** secrets.  
  Never commit them to source control and never expose them to the browser.
- Rate limiting is applied globally (100 req/15 min) and stricter on AI endpoints (20 req/min).
- CORS is restricted to the origins listed in `ALLOWED_ORIGINS`.
- Helmet sets secure HTTP headers on all responses.
