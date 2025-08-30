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

This project uses Jest for unit tests.

Scripts:

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# CI mode (single-threaded)
npm run test:ci
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Notes

- The Angular CLI `test` target (Karma) was removed from `angular.json` to avoid confusion, since Jest is used instead. Use the npm scripts above to run tests.

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
