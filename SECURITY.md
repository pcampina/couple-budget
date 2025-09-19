# Security Policy

We take the security of CoupleBudget seriously. Please follow these guidelines when reporting vulnerabilities.

## Supported Versions

Only the latest commit on the `main` branch is actively supported for security updates.

## Reporting a Vulnerability

- Do not create a public issue for security reports.
- Instead, email the maintainer at: security@pcampina.dev (or open a private security advisory in GitHub).
- Include a detailed description, reproduction steps, affected versions/commits, and any suggested mitigations.
- We aim to acknowledge reports within 72 hours and provide a remediation plan as soon as possible.

## Best Practices in This Repo

- No secrets are committed. Use `.env` locally and `scripts/gen-config.mjs` to generate `public/config.js` at build time.
- CI builds generate a non-sensitive runtime config for Netlify (no API by default).
- Dependencies are scanned and updated regularly via Dependabot.
