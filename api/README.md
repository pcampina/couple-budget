# CoupleBudget API (TypeScript)

HTTP API for participants, expenses, stats, activities and authentication.

## Overview
- Resources: `participants`, `expenses`, `stats`, `activities`, `auth`.
- Split logic: proportional to income.
- Persistence: Postgres when `SUPABASE_DB_URL` is set; in-memory fallback otherwise.
- CORS: enabled (`*`).
- Auth: JWT HS256 (Bearer) — `AUTH_JWT_SECRET` is used to sign/verify tokens.

Roles & permissions
- `user`: can read and manage own expenses, list activities.
- `admin`: can manage participants (add/update/delete). GET endpoints require at least `user`.

## Run locally

```bash
cp .env.example .env
# set AUTH_JWT_SECRET and SUPABASE_DB_URL if using Postgres
npm run db:migrate
npm run api   # http://localhost:3333
```

Docker Compose:
```bash
docker compose up -d
```

## API Docs
- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /swagger.json`

## Auth
- `POST /auth/register` — { name, email, password }
- `POST /auth/login` — { email, password } → { access_token }
- `GET /auth/verify` — with `Authorization: Bearer <token>` → { valid, payload? }

## Participants
- `GET /participants`
- `POST /participants` — { name, email?, income }
  - 409 Conflict when email already exists
- `PATCH /participants/:id` — { name?, email?, income? }
- `DELETE /participants/:id`

## Expenses
- `GET /expenses` — supports pagination via `?page=1&limit=20`
  - Without pagination params returns a plain array
  - With params returns `{ items, total, page, pageSize }`
- `POST /expenses` — { name, total }
  - Requires at least one participant to exist
  - The expense is owned by the authenticated user
- `PATCH /expenses/:id` — only owner can update
- `DELETE /expenses/:id` — only owner can delete

## Stats
- `GET /stats` — returns `{ participants, expenses, participantShares, expensesWithAllocations, totalIncome, totalExpenses, totalsPerParticipant }`

## Activities
- `GET /activities` — paginated: `{ items, total, page, pageSize }`

## Env vars
- `PORT` — API port (default: 3333)
- `AUTH_JWT_SECRET` — JWT secret for HS256
- `SUPABASE_DB_URL` — Postgres connection string

## Examples
```bash
# Register user
curl -sS -X POST http://localhost:3333/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Alex","email":"alex@example.com","password":"secret"}'

# Login
TOKEN=$(curl -sS -X POST http://localhost:3333/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"alex@example.com","password":"secret"}' | jq -r .access_token)

# Create participant (admin token required)
curl -sS -X POST http://localhost:3333/participants \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","income":1000}'

# Create expense (user owns)
curl -sS -X POST http://localhost:3333/expenses \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Internet","total":50}'

# List activities (paginated)
curl -sS 'http://localhost:3333/activities?page=1&limit=20' \
  -H "authorization: Bearer $TOKEN" | jq .
```

