# PocketWardrobe (wardrobe-app)

A pnpm-based TypeScript monorepo that contains:
- Domain core (pure TypeScript, framework-agnostic)
- Infrastructure adapters (e.g., Supabase persistence) intended for serverless/function runtimes

This repository does not include the mobile UI or a standalone web server. “Running the app” locally means installing dependencies, building the packages, and executing unit/integration tests. Integration tests can run against a local Supabase instance.

---

## Prerequisites
- Node.js >= 18
- pnpm >= 8 (repo uses a newer version; see package.json “packageManager”)
  - Install: npm i -g pnpm
- (Optional, for integration tests) Supabase CLI
  - Install: https://supabase.com/docs/guides/cli

## Quick start
1) Install dependencies (monorepo root):
   - pnpm install

2) Build all packages:
   - pnpm build
   - or recursive: pnpm -r build

3) Run unit tests:
   - pnpm test
   - or watch mode per package:
     - pnpm --filter @pocketwardrobe/domain test:watch
     - pnpm --filter @pocketwardrobe/functions test:watch

4) Type-check all packages:
   - pnpm typecheck

## Running integration tests with local Supabase (optional)
Some tests under packages/functions are integration tests for the Supabase adapters. They are skipped by default unless a local Supabase URL is provided via environment variables.

- Start Supabase locally (first time may take a moment):
  - supabase start
  - Optionally reset the DB to match the expected schema/data for a clean run:
    - supabase db reset

- Export the environment variables used by the tests:
  - On macOS/Linux:
    - export SUPABASE_LOCAL_URL="http://localhost:54321"
    - export SUPABASE_LOCAL_ANON_KEY="your-local-anon-key"  # optional; tests default to a placeholder
  - On Windows (PowerShell):
    - $env:SUPABASE_LOCAL_URL = "http://localhost:54321"
    - $env:SUPABASE_LOCAL_ANON_KEY = "your-local-anon-key"

- Run the tests (only the integration tests that detect SUPABASE_LOCAL_URL will execute):
  - pnpm --filter @pocketwardrobe/functions test

Notes:
- The integration suite uses Vitest and will automatically skip if SUPABASE_LOCAL_URL is not set.
- The repository includes SQL migrations under supabase/migrations. Use supabase db reset to apply them to your local instance if needed.

## Common workspace commands
- Build everything: pnpm -r build
- Test everything: pnpm -r test
- Type-check everything: pnpm -r typecheck
- Run commands for a single package:
  - pnpm --filter @pocketwardrobe/domain <script>
  - pnpm --filter @pocketwardrobe/functions <script>

## Project structure (high level)
- packages/
  - domain/ — Pure domain entities, value objects, and use cases (TypeScript)
  - functions/ — Adapters (e.g., Supabase) and related tests intended for serverless/function runtimes
- supabase/ — Local development SQL migrations and related assets
- docs/ — Architecture and requirements docs

## Troubleshooting
- pnpm not found → Install pnpm globally: npm i -g pnpm
- Type errors during build → Run pnpm typecheck to see detailed diagnostics
- Integration tests skipped unexpectedly → Ensure SUPABASE_LOCAL_URL is set in your shell environment before running the tests
 - Error when using npm workspaces flags (e.g., `--workspace`): This repo uses pnpm workspaces. Use pnpm commands shown above.

## License
This project is licensed under the MIT License. See LICENSE for details.