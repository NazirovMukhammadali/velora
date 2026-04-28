# Velora API

Velora API is a portfolio-grade NestJS + GraphQL backend for a travel booking demo.
It focuses on clean architecture, maintainable code, and practical domain boundaries without production-scale complexity.

## Core modules

- `member`, `auth`, `follow`, `like`, `view`
- `flights`, `hotels`, `rentcar`, `tours`
- `bookings` (minimal workflow: create, list mine, confirm)
- `comment` (agent-level review/rating with purchase gate)

## Requirements

- Node.js 20+
- npm 10+
- MongoDB (local or remote)

## Environment setup

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

## Install and run

```bash
npm install
npm run start:dev
```

GraphQL endpoint: `http://localhost:3003/graphql`

## Quality commands

```bash
# lint + compile
npm run lint
npm run build

# unit tests
npm run test

# e2e-lite suite
npm run test:e2e

# integration e2e (mongo-memory; skipped on darwin local)
npm run test:integration
```

## Seed commands

```bash
npm run seed:flights
npm run seed:hotels
npm run seed:rentcar
npm run seed:tours
```

## Git hooks and CI

- `husky` + `lint-staged` run formatting/lint checks on staged files.
- GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run test -- --runInBand`
  - `npm run test:integration`

## Operational notes

- In production:
  - GraphQL Playground and introspection are disabled.
  - CORS origins are restricted via `CORS_ORIGINS`.
- Review write policy:
  - Only `USER` can write review/rating on `AGENT`.
  - Writer must have at least one `CONFIRMED` `TOUR` booking with that agent.

## Runbook

See `docs/RUNBOOK.md` for release and incident response procedures.
