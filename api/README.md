# CoupleBudget API (TypeScript)

Minimal, stateless, in-memory HTTP API that exposes participants, expenses, and statistics for CoupleBudget. Built with Node + TypeScript, no runtime dependencies.

## Table of Contents
- Overview
- How to Run
- Endpoints
- Models & Types
- Architecture
- Tests
- Behavior & Errors
- Roadmap (optional)

---

## Overview
- Resources: `participants`, `expenses`, `stats`.
- Split logic: proportional to income (split by income).
- Persistence: in-memory only (restart resets state).
- CORS: enabled (origin `*`, methods `GET, POST, PATCH, DELETE, OPTIONS`).

### Authentication (Supabase-compatible JWT)
- Set `AUTH_JWT_SECRET` to enable authentication. When not set, auth is disabled (useful for local tests).
- Bearer tokens are validated as HS256 JWTs using `AUTH_JWT_SECRET`.
- Roles:
  - `user`: any valid token (or `role: authenticated`).
  - `admin`: requires `app_metadata.roles` to include `admin`.
- Permissions:
  - GET endpoints require `user`.
  - Mutations (POST/PATCH/DELETE) require `admin`.

## How to Run
Requirements: Node.js 18+.

Development (ts-node):

```bash
cp .env.example .env
# edit .env (PORT, AUTH_JWT_SECRET, API_URL, SUPABASE_*)

npm run api
# starts at http://localhost:3333 (override with PORT=xxxx or in .env)
```

Build and run (compiled JS):

```bash
npm run build:api
node dist-api/server.js
```

Environment variables:
- `PORT`: API port (default: `3333`).
- `AUTH_JWT_SECRET`: Supabase JWT secret to enable auth (HS256).
- `SUPABASE_DB_URL`: Postgres connection string (Supabase). Required for persistence.

### Quickstart: Auth

1) Create `.env` with your Supabase JWT secret:

```
AUTH_JWT_SECRET=YOUR_SUPABASE_JWT_SECRET
```

2) Issue a JWT for testing (role `admin`). Example payload (claims simplified):

```json
{
  "sub": "user-id-123",
  "role": "authenticated",
  "app_metadata": { "roles": ["admin"] },
  "exp": 4070908800
}
```

Sign this payload with HS256 using `AUTH_JWT_SECRET` and use it as:

```
Authorization: Bearer <token>
```

3) Call endpoints:

- GETs require `user` (any valid token).
- Mutations require `admin`.

### Database & Migrations (Knex)

Run migrations to create tables (`budgets`, `participants`, `expenses`):

```bash
cp .env.example .env
# set SUPABASE_DB_URL in .env

npx knex --knexfile api/knexfile.mjs migrate:latest

# or via npm script (if added):
npm run db:migrate
```

Notes:
- When `SUPABASE_DB_URL` is not set, the API falls back to in-memory storage (useful for local tests), but data is not persisted.

## Docker

Local stack with Postgres and the API:

```bash
docker compose up --build
# API at http://localhost:3333, Postgres at localhost:5432
```

Environment defaults (see `docker-compose.yml`):
- DB: `postgresql://couple:couple@db:5432/couple_budget`
- API: `AUTH_JWT_SECRET=dev-secret-change-me`

The container runs migrations automatically before starting the server.

## Endpoints
Base URL: `http://localhost:3333`

### GET /participants
List all participants.

Response 200:
```json
[
  { "id": "p1", "name": "John Doe", "income": 2000 },
  { "id": "p2", "name": "Jane Doe", "income": 1600 }
]
```

### POST /participants
Create a participant.

Request body:
```json
{ "name": "Alice", "income": 1000 }
```

Response 201:
```json
{ "id": "px", "name": "Alice", "income": 1000 }
```

### PATCH /participants/:id
Partially update a participant.

Request body (all fields optional):
```json
{ "name": "Alice Silva", "income": 1200 }
```

Response 200:
```json
{ "id": "px", "name": "Alice Silva", "income": 1200 }
```

### DELETE /participants/:id
Delete a participant.

Response 204 (no content)

---

### GET /expenses
List all expenses.

Response 200:
```json
[
  { "id": "e1", "name": "Rent", "total": 1200 }
]
```

### POST /expenses
Create an expense.

Request body:
```json
{ "name": "Internet", "total": 50 }
```

Response 201:
```json
{ "id": "ex", "name": "Internet", "total": 50 }
```

### PATCH /expenses/:id
Partially update an expense.

Request body (all fields optional):
```json
{ "name": "Internet 1Gb", "total": 60 }
```

Response 200:
```json
{ "id": "ex", "name": "Internet 1Gb", "total": 60 }
```

### DELETE /expenses/:id
Delete an expense.

Response 204 (no content)

---

### GET /stats
Return an aggregated snapshot of the current state (participants, expenses, and derived calculations).

Response 200:
```json
{
  "participants": [ { "id": "p1", "name": "John", "income": 2000 } ],
  "expenses": [ { "id": "e1", "name": "Rent", "total": 1200 } ],
  "participantShares": [ { "id": "p1", "name": "John", "share": 1 } ],
  "expensesWithAllocations": [ { "id": "e1", "name": "Rent", "total": 1200, "allocations": { "p1": 1200 } } ],
  "totalIncome": 2000,
  "totalExpenses": 1200,
  "totalsPerParticipant": { "p1": 1200 }
}
```

## curl Examples
```bash
# Create participant
curl -sS -X POST localhost:3333/participants \
  -H 'content-type: application/json' \
  -d '{"name":"Alice","income":1000}'

# List expenses
curl -sS localhost:3333/expenses | jq .

# Get statistics
curl -sS localhost:3333/stats | jq .
```

## Models & Types (TypeScript)
Key interfaces (summary):

```ts
// api/state.ts
export interface Participant { id: string; name: string; income: number }
export interface Expense { id: string; name: string; total: number }

// GET /stats response (simplified shape)
interface StatsResponse {
  participants: Participant[];
  expenses: Expense[];
  participantShares: { id: string; name: string; share: number }[];
  expensesWithAllocations: (Expense & { allocations: Record<string, number> })[];
  totalIncome: number;
  totalExpenses: number;
  totalsPerParticipant: Record<string, number>;
}
```

## Architecture
- `api/app.ts`: creates the app and registers resources.
- `api/router.ts`: small router with `:id` params.
- `api/state.ts`: in-memory state and models.
- `api/domain/split.ts`: income-based split logic.
- `api/resources/*.ts`: per-resource handlers (`participants`, `expenses`, `stats`).
- `api/utils.ts`: HTTP helpers (`send`, `readJson`) and `uid`.
- `api/server.ts`: simple HTTP bootstrap (reads `PORT`).

Decisions:
- No framework to reduce dependencies; can be ported to Express/Fastify if needed.
- CORS always enabled for easier local integration.

## Tests
Run all tests (Vitest):

```bash
npm test
```

- API test suites live next to the resources:
  - `api/resources/participants.spec.ts`
  - `api/resources/expenses.spec.ts`
  - `api/resources/stats.spec.ts`
- Tests use `supertest` against the app handler (no port binding).

## Behavior & Errors
- 200/201/204 for successful operations; 404 when resource not found.
- 500 for unexpected handler errors.
- Basic validations:
  - `income` and `total` normalized to `>= 0` and numbers.
  - `name` is `trim()`-ed with a simple fallback.

## Roadmap (optional)
- Persistence (SQLite/file) with per-resource repositories.
- AuthN/AuthZ (tokens) and access scopes.
- OpenAPI/Swagger for docs and clients.
- API versioning (`/v1`, `/v2`).
- Service layer separated from storage to ease testing and swapping stores.

---

License: same as the main repository.
