# CoupleBudget

[![CI](https://github.com/pcampina/couple-budget/actions/workflows/ci.yml/badge.svg)](https://github.com/pcampina/couple-budget/actions/workflows/ci.yml)

Budget planning for couples and small groups, built with Angular (frontend) and a lightweight Node.js API backed by PostgreSQL.

## Architecture at a glance

| Component | Description |
|-----------|-------------|
| **Frontend** | Angular SPA served from an S3 bucket behind CloudFront (`infra/frontend-s3-cloudfront.yaml`). |
| **API** | Node.js HTTP server packaged as a Docker image and deployed to AWS Fargate (`infra/backend-fargate.yaml`). |
| **Database** | Amazon RDS for PostgreSQL, credentials stored in AWS Secrets Manager (`infra/rds-postgress.yaml`). |
| **Networking** | VPC with private subnets and interface VPC endpoints for ECR, CloudWatch Logs, Secrets Manager and KMS to keep Fargate fully private (`infra/network.yaml`). |

## Local development

1. **Prerequisites**
   - Node.js 20.x and npm
   - Docker (optional but recommended for Postgres/Mailhog)
   - PostgreSQL 16 locally or a connection string you can reach from your machine

2. **Bootstrap the environment**
   ```bash
   cp .env.example .env                # configure API + frontend flags
   docker compose up -d db mailhog     # optional helpers (Postgres + SMTP)
   npm ci                              # install dependencies
   npm run db:migrate                  # create tables (uses SUPABASE_DB_URL or DB_* vars)
   ```

3. **Run the stack**
   ```bash
   npm run api     # http://localhost:3333
   npm start       # http://localhost:4200
   ```

   - To point the UI at the API set `USE_API=true` and `API_URL=http://localhost:3333` in `.env` before running `npm start` (the `scripts/gen-config.mjs` task injects these values).
   - Without a database connection the API falls back to an in-memory store; useful for quick demos but not persistent.

4. **Mailhog (optional)**
   - Web UI: `http://localhost:8025`
   - SMTP: `localhost:1025`

## Database connectivity & TLS

The API constructs the Postgres connection from either:

1. `SUPABASE_DB_URL` (full connection string) **or**
2. `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

When the host is not `localhost/127.0.0.1`, TLS is enabled automatically with `rejectUnauthorized=false`; this allows the container to talk to the RDS instance even when the AWS CA bundle is not bundled in the image. On Fargate the stack also sets `NODE_TLS_REJECT_UNAUTHORIZED=0`, so you do **not** have to manage certificates manually.

For local development you typically want:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appdb
DB_USER=postgres
DB_PASSWORD=postgres
```

## Deploying manually from your workstation

`infra/deploy-all-local.sh` wires everything up in the right order (certificates, network, ECR, RDS, backend, frontend, DNS) and now accepts an optional `IMAGE_TAG`:

```bash
cd infra
IMAGE_TAG=$(git rev-parse --short HEAD) ./deploy-all-local.sh
```

The script:

- Builds the backend image with Buildx for `linux/amd64` and `linux/arm64`, pushes both `:IMAGE_TAG` and `:latest`.
- Passes the same `IMAGE_TAG` to the backend CloudFormation stack so Fargate pulls the freshly pushed image.

Prerequisites: AWS CLI v2 logged in, Docker with Buildx enabled, and permissions to create CloudFormation stacks, ECR repos and push images.

## GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | PRs / pushes to `main` | Installs dependencies, runs lint (`npm run lint:ids`) and tests (`npm run test:ci`). |
| `deploy-infra.yml` | Manual (`workflow_dispatch`) | Deploys the CloudFormation stacks in dependency order. Inputs: `hostedZoneId`, `projectName`, `imageTag`. Run this when the infrastructure or stack parameters change. |
| `deploy-app.yml` | Push to `main` (or manual) | Builds the Docker image (root `Dockerfile`), pushes both `:latest` and `:${{ github.sha }}`, renders the ECS task definition with the new image, and forces a new deployment. To deploy from a commit message use `[deploy-backend]`; you can also trigger it from the Actions tab. |
| `deploy-frontend.yml` (job inside `deploy-app.yml`) | Same trigger | Builds Angular, syncs the generated `dist/` to the S3 bucket and invalidates CloudFront. |
| `codeql.yml` | Scheduled / pushes | Static application security analysis. |

Secrets required for deployment workflows:

- `AWS_ACCOUNT_ID`
- A GitHub OIDC role (`GitHubActionRole`) with permissions for CloudFormation, ECR, ECS, S3, CloudFront, Secrets Manager and RDS.

## Troubleshooting deployment

- **ECS task fails with `MODULE_NOT_FOUND` or migrations missing**: ensure you ran `npm run build:api` before building the image (the Dockerfile already does this) and that `ImageTag` in the backend stack points to the image you just pushed.
- **Cannot reach Secrets Manager / KMS**: the backend template provisions interface endpoints and the task execution role allows `secretsmanager:GetSecretValue` + `kms:Decrypt`. If you removed those resources, redeploy the backend stack.
- **Health check failing**: the target group now checks `GET /health`; the API responds `200` even before the database is available.
- **TLS errors when connecting to RDS**: handled automatically by the stack (`NODE_TLS_REJECT_UNAUTHORIZED=0`) and the API connection builder. For local runs against AWS RDS you may need to export the same env variable.

## Testing matrix

```bash
npm run lint:ids   # validates UUID usage
npm run test:ci    # Vitest unit tests
npm run build      # Angular production build
```

## Project layout

- `src/` – Angular application.
- `api/` – Node.js HTTP API (see `api/routes` and `api/db.ts`).
- `infra/` – CloudFormation templates + helper script.
- `.github/workflows/` – CI/CD pipelines.

## License

MIT — see `LICENSE`.
