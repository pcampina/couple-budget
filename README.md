# CoupleBudget

[![Deploy to GitHub Pages](https://github.com/pcampina/couple-budget/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/pcampina/couple-budget/actions/workflows/deploy-pages.yml)

## Demo

- Live: https://pcampina.github.io/couple-budget/
  - Deployed automatically on every push to `main` via GitHub Actions.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.1.

## Overview

- Multi-participant budgeting: expenses are split proportionally by each participant's income.
- Participants are dynamic: starts with two, you can add/remove more (guard keeps at least two).
- State persistence: participants and expenses persist to `localStorage`.
- API docs: `api/README.md`

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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

This repository now includes a minimal Node HTTP API that exposes the core budgeting features (participants, expenses, allocations) with no external dependencies.

- Full API docs: `api/README.md`

Run the API locally:

```bash
npm run api
```

It starts on `http://localhost:3333` with CORS enabled. Endpoints:

- GET `/participants` — list participants
- POST `/participants` — `{ name, income }`
- PATCH `/participants/:id` — partial update `{ name?, income? }`
- DELETE `/participants/:id`
- GET `/expenses` — list expenses
- POST `/expenses` — `{ name, total }`
- PATCH `/expenses/:id` — partial update `{ name?, total? }`
- DELETE `/expenses/:id`
- GET `/stats` — snapshot with `participants`, `expenses`, `participantShares`, `expensesWithAllocations`, `totalIncome`, `totalExpenses`, `totalsPerParticipant`

Note: Data is kept in-memory for simplicity.

#### Authentication (Supabase)

- Backend (API): set `AUTH_JWT_SECRET` to enable JWT validation (HS256). When not set, auth is disabled for local/dev.
- Roles: GET endpoints require `user`; mutations (POST/PATCH/DELETE) require `admin` in `app_metadata.roles`.
- Frontend: configure Supabase client in `src/index.html` (see snippet below) and use the login UI in the header.

Snippet (uncomment in `src/index.html`):

```html
<script>
  window.__USE_API__ = true;
  window.__API_URL__ = 'http://localhost:3333';
  window.__SUPABASE_URL__ = 'https://YOUR-PROJECT.supabase.co';
  window.__SUPABASE_ANON_KEY__ = 'YOUR_ANON_KEY';
</script>
```

### Frontend Integration

The Angular app can run fully client-side (default) or consume the API.

- Default (client-only): nothing to do. State persists to `localStorage`.
- API mode: enable the flag in `src/index.html` (uncomment the snippet):

```html
<script>
  window.__USE_API__ = true;
  window.__API_URL__ = 'http://localhost:3333';
  // start the server with: npm run api
  // then: npm start
  // the UI will reflect server state
  // (participants/expenses are fetched and mutations call the API)
}
</script>
```

In API mode, local `localStorage` persistence is disabled; data lives on the API process.
```

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

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Domain model

- `Participant`: `{ id, name, income }`
- `Expense`: `{ id, name, total }`
- Split logic: `splitByIncome(total, participants[]) -> Record<participantId, amount>`

## Persistence

- The `BudgetStore` saves `{ participants, expenses }` under the key `couple-budget/state/v1` in `localStorage`.
- On startup, it attempts to load and validate persisted state (non-negative values, at least two participants).

## UI behavior

- Configuration: edit participant names and incomes; add/remove participants.
- Expenses table: dynamically renders a column per participant, with totals per participant in the footer.
