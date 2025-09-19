# CoupleBudget

[![CI](https://github.com/pcampina/couple-budget/actions/workflows/ci.yml/badge.svg)](https://github.com/pcampina/couple-budget/actions/workflows/ci.yml)

## Demo

- Live: https://couplebudget.netlify.app/
  - Deployed automatically via Netlify after merges to `main`.

## Hosting

- **Frontend** — Netlify (`netlify.toml`) builds the Angular app with `ng build` and serves the static assets from `dist/couple-budget/browser`.
- **API** — Render (`render.yaml`) provisions a free Postgres instance and deploys the Node API. The service runs `npm run build:api` during build and starts with `npm run db:migrate && node dist-api/server.js`. Custom environment values (such as `PUBLIC_APP_URL`) can be provided via the Render dashboard.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.1.

## Overview

- Multi-participant budgeting: transactions are split proportionally by each participant's income.
- Participants are dynamic: starts with two, you can add/remove more (guard keeps at least two).
- Persistence via API: when API mode is enabled, data persists in Postgres; otherwise, the UI keeps data in-memory for the session.
- API docs: `api/README.md`

## Development server

Recommended local setup (API + Frontend + Mailhog):

```bash
# 1) Copy environment and adjust values
cp .env.example .env

# 2) Start Postgres and Mailhog (optional if you have local services)
# docker compose up -d db mailhog

# 3) Run DB migrations (creates tables)
npm run db:migrate

# 4) Start the API (http://localhost:3333 by default)
npm run api

# 5) In a separate terminal, start the frontend (http://localhost:4200)
npm start
```

Notes:
- Do not commit `.env`. Use `.env.example` as a template.
- `npm start` generates `public/config.js` from `.env` (via `scripts/gen-config.mjs`).
- For API mode, set at least `USE_API=true` and `API_URL=http://localhost:3333`.
- For DB persistence, set `SUPABASE_DB_URL` and run migrations. If unset, the API uses an in-memory store.

### Email (Mailhog)

For local email testing, the API can send invites via SMTP. Use Mailhog:

```
docker compose up -d mailhog
# Web UI: http://localhost:8025
# SMTP: localhost:1025
```

Set in `.env` (already defaults for Mailhog):

```
PUBLIC_APP_URL=http://localhost:4200
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=CoupleBudget <noreply@example.com>
```

Invite emails include a link such as `http://localhost:4200/invite/<token>`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

This project uses Vitest for unit tests.

Scripts:

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# CI mode
npm run test:ci

Environment: jsdom; path aliases mirror `tsconfig.json`.

### API Server

This repository now includes a minimal Node HTTP API that exposes the core budgeting features (participants, transactions, allocations) with no external dependencies.

- Full API docs: `api/README.md`

Run the API locally:

```bash
npm run api
```

It starts on `http://localhost:3333` with CORS enabled. Highlights:

- Auth: `POST /auth/register`, `POST /auth/login` → JWT, `GET /auth/verify`
- Participants: `GET /participants`, `POST /participants` (name, email?, income), `PATCH`, `DELETE`
- Transactions: `GET /expenses?page=&limit=` (paginated); `POST` (requires 1 participant; owned by user), `PATCH`/`DELETE` (owner only)
- Stats: `GET /stats` — snapshot with `participants`, `transactions`, `participantShares`, `transactionsWithAllocations`, `totalIncome`, `totalTransactions`, `totalsPerParticipant`
- Activities: `GET /activities?page=&limit=` — user activity log (paginated)

Persistence:
- With `SUPABASE_DB_URL` set: uses Postgres (run `npm run db:migrate` first).
- Without `SUPABASE_DB_URL`: falls back to in-memory store (non-persistent).

#### Authentication

- Backend: set `AUTH_JWT_SECRET` (HS256) in `.env`.
- Roles: GET endpoints require `user`. Mutations for participants require `admin`; transactions require `user` (owner only).

### Frontend Integration

The Angular app can run fully client-side (in-memory) or consume the API.

- Default (client-only): no configuration required; state is in-memory for the session.
- API mode: enable the flag via `.env` (recommended) or uncomment the snippet in `src/index.html`:

```html
<script>
  window.__USE_API__ = true;
  window.__API_URL__ = 'http://localhost:3333';
  // start the server with: npm run api
  // then: npm start
  // the UI will reflect server state
}
</script>
```

Alternatively, use `.env` + `npm start`:

```
USE_API=true
API_URL=http://localhost:3333
```

`scripts/gen-config.mjs` will emit a real boolean for `__USE_API__`.

In API mode, local persistence is disabled; data lives on the API and, when configured, in Postgres.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Notes

- Tests run with Vitest; Karma is not used.
- ID generation: use native random UUIDs
  - Frontend (browser): `crypto.randomUUID()` directly
  - API (Node): `uuid()` exported from `api/utils.ts` (uses `node:crypto` randomUUID)
  - Check locally: `npm run lint:ids` (fails on non-UUID patterns)

## Security

- See `SECURITY.md` for reporting guidelines.
- CI builds and Netlify deploys do not embed secrets; runtime config is generated without sensitive values.

## Contributing

- See `CONTRIBUTING.md` for commit style and development tips.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Domain model

- `Participant`: `{ id, name, email?, income }`
- `Transaction`: `{ id, name, total }`
- Split logic: `splitByIncome(total, participants[]) -> Record<participantId, amount>`

## Persistence

- API mode: data persists in Postgres when `SUPABASE_DB_URL` is configured and migrations are applied; otherwise, the API uses an in-memory fallback (non-persistent).
- Client-only mode: state is kept in-memory (no localStorage persistence in the current version).

## UI behavior

- Configuration: edit participant names and incomes; add/remove participants.
- Transactions table: dynamically renders a column per participant, with totals per participant in the footer.
