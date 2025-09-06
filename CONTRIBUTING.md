# Contributing

Thanks for your interest in contributing to CoupleBudget!

## Development

- Node.js 20.x is recommended.
- Install dependencies with `npm ci`.
- Run tests with `npm test` (or `npm run test:watch`).
- Start the API with `npm run api` and the frontend with `npm start`.

## Commit Style

Please use [Conventional Commits](https://www.conventionalcommits.org/):

- feat(scope): short description
- fix(scope): short description
- docs(scope): short description
- chore(scope): short description
- ci(scope): short description

Examples:
- fix(ui): ensure data-table fills row width when debug column hidden
- ci: add test workflow and code scanning

## Environment & Secrets

- Do not commit `.env` or any secrets.
- Copy `.env.example` to `.env` and adjust locally.
- CI generates a public `config.js` without secrets.

