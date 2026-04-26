# Velora API

Velora API is a NestJS + GraphQL backend for a travel marketplace with domain-separated flows:

- `Flights`, `Hotels`, `Rentcar` are primary catalog domains.
- `Tours` are agent-centric and stay separate from primary catalog tabs.
- `Most Popular Tour Packages` are ranked using sold-count oriented logic.
- `Bookings` provide purchase truth for gated workflows (reviews/ratings).

## Core modules

- `member`, `auth`, `follow`, `like`, `view`
- `flights`, `hotels`, `rentcar`, `tours`
- `bookings` (tour purchase source of truth)
- `comment` (agent-level review/rating with purchase gate)

## Requirements

- Node.js 20+
- npm 10+
- MongoDB (local or remote)

## Environment setup

Create `.env` in repo root:

```env
NODE_ENV=development
PORT=3003
MONGO_DEV=mongodb://127.0.0.1:27017/velora_dev
MONGO_PROD=mongodb://127.0.0.1:27017/velora_prod
SECRET_TOKEN=replace-with-strong-secret
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
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
  - Writer must have at least one `CONFIRMED` or `PAID` `TOUR` booking with that agent.

## Runbook

See `docs/RUNBOOK.md` for release and incident response procedures.
