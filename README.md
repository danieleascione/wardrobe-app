# PocketWardrobe

PocketWardrobe is an AI-powered mobile wardrobe management app. Users digitize physical garments via camera, receive AI-curated daily outfit suggestions contextualised by weather and occasion, and track wear history to surface underutilised items. The backend runs as AWS Lambda functions backed by a PostgreSQL database (Supabase), with garment photos stored on S3 and served via CloudFront.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22 LTS | https://nodejs.org or `nvm install 22` |
| pnpm | 8+ | `npm i -g pnpm` |
| Supabase CLI | latest | https://supabase.com/docs/guides/cli |
| AWS CLI | v2 | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| AWS SAM CLI | latest | https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html |
| Expo CLI | latest | `npm i -g expo-cli` (mobile only — separate repo) |

---

## Local Development

Local development runs the entire backend on your machine: Supabase (PostgreSQL + Auth) via Docker, and an Express HTTP server that wraps the Lambda handlers identically to how API Gateway invokes them in production. The mobile app connects to this local server.

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd wardrobe-app
pnpm install
```

### Step 2 — Start local Supabase

Supabase CLI uses Docker to spin up PostgreSQL, Auth, and the REST API locally.

```bash
supabase start
```

On first run this pulls Docker images (~2 min). On success it prints your local credentials:

```
API URL: http://localhost:54321
DB URL:  postgresql://postgres:postgres@localhost:54322/postgres
anon key: eyJ...
service_role key: eyJ...
```

Keep these for the next step.

### Step 3 — Run database migrations

```bash
supabase db push
```

This applies all migrations in `supabase/migrations/` to your local database.

### Step 4 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values printed by `supabase start`:

```
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<your-local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
LOCAL=true
NODE_ENV=development
```

The `LOCAL=true` flag switches the backend from AWS Lambda invocation to the Express local server. All other variables are documented in the [Environment Variables](#environment-variables) section below.

### Step 5 — Start the local Lambda server

From the repo root:

```bash
pnpm --filter @pocketwardrobe/functions dev
```

This starts an Express server on `http://localhost:3000` that routes HTTP requests to the same Lambda handler functions used in production. The server hot-reloads on file changes via `tsx watch`.

### Step 6 — Run domain tests

```bash
pnpm --filter @pocketwardrobe/domain test
```

Domain unit tests run in-memory with no external services required.

### Step 7 — Start the mobile app

The mobile app lives in a separate repository. Clone it and follow the Expo setup guide:

- https://docs.expo.dev/get-started/create-a-project/

Set the API base URL in the mobile app's environment config to `http://localhost:3000`.

---

## Running Tests

### Domain unit tests

```bash
pnpm --filter @pocketwardrobe/domain test
```

Tests run against in-memory adapters. No database or network required.

### Functions adapter tests

```bash
pnpm --filter @pocketwardrobe/functions test
```

Integration tests for the Supabase adapters are skipped unless `SUPABASE_LOCAL_URL` is set. Start Supabase first (`supabase start`), then:

```bash
export SUPABASE_LOCAL_URL=http://localhost:54321
export SUPABASE_LOCAL_ANON_KEY=<your-local-anon-key>
pnpm --filter @pocketwardrobe/functions test
```

### Acceptance (Cucumber) tests

```bash
pnpm --filter @pocketwardrobe/tests test:smoke
```

Runs the smoke profile of the Cucumber acceptance suite against the in-process container. No running server required — tests wire the container directly.

### All tests

```bash
pnpm test
```

---

## Deployment

### Step 1 — Create a Supabase project

1. Go to https://supabase.com and create a new project in the **eu-west-1** region.
2. Once created, go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### Step 2 — Apply migrations to the cloud database

Link your local CLI to the Supabase project:

```bash
supabase link --project-ref <your-project-ref>
```

Then push the schema:

```bash
supabase db push --linked
```

### Step 3 — Configure AWS credentials

```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, and set the default region to `eu-west-1`.

### Step 4 — Store secrets in AWS SSM Parameter Store

Store secrets as SecureString parameters so SAM can inject them into Lambda:

```bash
aws ssm put-parameter --name "/pocketwardrobe/prod/SUPABASE_URL" \
  --value "<your-supabase-url>" --type SecureString

aws ssm put-parameter --name "/pocketwardrobe/prod/SUPABASE_SERVICE_ROLE_KEY" \
  --value "<your-service-role-key>" --type SecureString

aws ssm put-parameter --name "/pocketwardrobe/prod/NANO_BANANA_API_KEY" \
  --value "<your-nano-banana-key>" --type SecureString

aws ssm put-parameter --name "/pocketwardrobe/prod/NANO_BANANA_API_URL" \
  --value "<your-nano-banana-url>" --type SecureString
```

### Step 5 — First deployment (interactive)

From the repo root:

```bash
pnpm --filter @pocketwardrobe/functions deploy
```

SAM will guide you through: stack name, region, S3 bucket for deployment artifacts, and capability confirmation. Accept the defaults or customise as needed. SAM saves your choices to `samconfig.toml` so subsequent deploys are non-interactive.

### Subsequent deployments

```bash
pnpm --filter @pocketwardrobe/functions deploy:prod
```

### Rollback

Lambda deployments are versioned. To roll back to the previous version:

```bash
aws lambda update-function-code --function-name pocketwardrobe-<handler-name> \
  --qualifier <previous-version-number>
```

Or redeploy the previous Git commit:

```bash
git checkout <previous-commit>
pnpm --filter @pocketwardrobe/functions deploy:prod
```

---

## Cost Breakdown (Free Tier Analysis)

All services operate within free tiers for early MVP usage (< 1,000 MAU).

| Service | Free Tier | Typical MVP Usage | Cost Beyond Free |
|---------|-----------|-------------------|-----------------|
| Supabase | 500MB DB, 50k API req/month, 1GB storage | < 50MB DB, < 5k req/month | $25/month Pro plan |
| AWS Lambda | 1M requests/month, 400k GB-seconds/month | < 10k requests/month | $0.0000166 per GB-second |
| AWS API Gateway (HTTP) | 1M requests/month (first 12 months) | < 10k requests/month | $1.00 per million requests |
| AWS S3 | 5GB storage, 20k GET, 2k PUT/month | < 1GB, < 500 PUT/month | $0.023 per GB/month |
| CloudFront | 1TB data transfer/month | < 1GB/month | $0.0085 per GB |
| AWS CloudWatch | 10 custom metrics, 5GB logs/month | < 5 metrics, < 1GB logs | $0.30 per metric/month |
| GitHub Actions | 2,000 minutes/month (public repo free) | < 200 min/month | $0.008 per minute |

**Estimated monthly cost at MVP**: $0 (within all free tiers)

**First paid threshold**: Supabase Pro ($25/month) triggered around 500MB DB or 50k API requests/month — approximately 1,000–2,000 active users.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL (local: `http://localhost:54321`) |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase public anon key (safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key (server-side only, full DB access) |
| `AWS_REGION` | Yes | `eu-west-1` | AWS region for S3 and Lambda |
| `S3_BUCKET_NAME` | Yes | — | S3 bucket name for garment photo storage |
| `NANO_BANANA_API_KEY` | Yes | — | Nano Banana API key for AI garment classification |
| `NANO_BANANA_API_URL` | Yes | — | Nano Banana API base URL |
| `OPEN_METEO_CACHE_TTL_HOURS` | No | `24` | Weather cache TTL in hours (resets at midnight local time) |
| `JWT_SECRET` | Local only | — | JWT signing secret for local auth validation |
| `PORT` | No | `3000` | Port for local Express server |
| `LOCAL` | No | — | Set to `true` to run Express server instead of Lambda handlers |
| `NODE_ENV` | No | `production` | `development` for local, `production` for AWS |

---

## Project Structure

```
packages/
  domain/          # Pure TypeScript domain core — no framework dependencies
  functions/       # Lambda handlers + adapter implementations
shared-types/      # TypeScript interfaces shared between mobile and backend
tests/             # Cucumber acceptance tests
supabase/
  migrations/      # PostgreSQL migration files (applied via Supabase CLI)
docs/
  design/          # Architecture, technology stack, component boundaries
  feature/         # Per-feature delivery documentation
.github/
  workflows/       # GitHub Actions CI pipeline
template.yaml      # AWS SAM infrastructure definition
```

---

## Troubleshooting

- **pnpm not found**: `npm i -g pnpm`
- **Type errors during build**: `pnpm typecheck` for detailed diagnostics
- **Integration tests skipped**: Ensure `SUPABASE_LOCAL_URL` is exported in your shell
- **SAM deploy fails**: Ensure AWS CLI is configured (`aws sts get-caller-identity` should return your account)
- **supabase start fails**: Docker must be running

---

## License

MIT — see [LICENSE](LICENSE).
