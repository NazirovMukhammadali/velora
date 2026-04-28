# Velora API

Velora API is a portfolio-grade NestJS + GraphQL backend for a travel booking demo.
It focuses on clean architecture, maintainable code, and practical domain boundaries without production-scale complexity.

## Core modules

- `member`, `auth`, `follow`, `like`, `view`
- `flights`, `hotels`, `rentcar`, `tours`
- `bookings` (minimal workflow: create, list mine, confirm)
- `comment` (agent-level review/rating with purchase gate)

## Domain responsibilities (locked)

- **Flights / Hotels / Rentcar**: search and discovery domains only.
  - Implemented responsibilities: search filters, list queries, detail view queries.
  - Not in scope: booking transactions for these three domains.
- **Tours**: core transactional domain.
  - Agent creates tour packages.
  - User views packages.
  - User creates booking via `createTourBooking`.
  - Admin confirms booking via `confirmTourBookingByAdmin`.
  - User review/rating write requires confirmed tour booking with target agent.

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
- Current temporary policy: lint is non-blocking in CI while global lint debt is cleaned in a separate task.

## Booking contract (locked)

- Booking domain is intentionally **tour-only** in MVP.
- `createTourBooking` always creates with `PENDING` status.
- `getMyTourBookings` lists only the authenticated member's tour bookings.
- `confirmTourBookingByAdmin` changes booking status from `PENDING` to `CONFIRMED`.
- Review/rating write access requires at least one `CONFIRMED` booking with the target agent.
- Real payment integration is intentionally out of scope for this portfolio MVP.

## Operational notes

- In production:
  - GraphQL Playground and introspection are disabled.
  - CORS origins are restricted via `CORS_ORIGINS`.
- Review write policy:
  - Only `USER` can write review/rating on `AGENT`.
  - Writer must have at least one `CONFIRMED` `TOUR` booking with that agent.

## Runbook

See `docs/RUNBOOK.md` for release and incident response procedures.
See `docs/BOOKING_DEMO_FLOW.md` for the end-to-end demo scenario.
See `docs/TECH_DEBT_SCOPE.md` for separated debt handling policy.
See `docs/API_HANDOFF_CHECKLIST.md` before starting frontend integration.
