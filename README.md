# Velora API

[![NestJS](https://img.shields.io/badge/NestJS-v10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-API-E10098?logo=graphql&logoColor=white)](https://graphql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-ODM-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jest](https://img.shields.io/badge/Tests-Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![ESLint](https://img.shields.io/badge/Lint-ESLint-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Format-Prettier-F7B93E?logo=prettier&logoColor=1A2B34)](https://prettier.io/)
[![CI](https://img.shields.io/github/actions/workflow/status/NazirovMukhammadali/velora/ci.yml?branch=develop&label=CI)](https://github.com/NazirovMukhammadali/velora/actions/workflows/ci.yml)

[![Flights](https://img.shields.io/badge/Domain-Flights-blue)](#domain-responsibilities-locked)
[![Hotels](https://img.shields.io/badge/Domain-Hotels-blue)](#domain-responsibilities-locked)
[![Rentcar](https://img.shields.io/badge/Domain-Rentcar-blue)](#domain-responsibilities-locked)
[![Tours](https://img.shields.io/badge/Domain-Tours-transactional-orange)](#domain-responsibilities-locked)
[![Bookings](https://img.shields.io/badge/Flow-Tour--only%20booking-success)](#booking-contract-locked)
[![Review Gate](https://img.shields.io/badge/Review-Confirmed%20booking%20required-success)](#booking-contract-locked)
[![Follow](https://img.shields.io/badge/Feature-Follow-informational)](#core-modules)
[![Like](https://img.shields.io/badge/Feature-Like-informational)](#core-modules)
[![AI Assistant](https://img.shields.io/badge/AI-Gemini%20travel%20assistant-8E75B2?logo=googlegemini&logoColor=white)](#core-modules)

Velora API is the NestJS + GraphQL backend of the Velora travel booking platform.
It focuses on clean architecture, maintainable code, and practical domain boundaries without production-scale complexity.
The web client lives in [velora-web](https://github.com/NazirovMukhammadali/velora-web).

## Tech stack

| Concern                  | Technology                                                                       |
| ------------------------ | -------------------------------------------------------------------------------- |
| Framework                | NestJS (Node.js), TypeScript                                                     |
| API architecture         | GraphQL (code-first) and REST health check (`GET /health`)                       |
| Database & ODM           | MongoDB, Mongoose                                                                |
| AI engine                | Google Gemini 3.5 Flash-Lite (`@google/genai`) with parallel tool calls          |
| Security & rate limiting | JWT authentication, `@nestjs/throttler` (global and AI assistant limits)         |
| Scheduling               | `@nestjs/schedule` (daily flight schedule roll-forward, listing rank batch)      |
| Testing                  | Jest (unit tests and in-memory MongoDB integration tests)                        |
| Tooling                  | npm (`package-lock.json`), ESLint, Prettier, Husky + lint-staged, GitHub Actions |

## Core modules

- `member`, `auth`, `follow`, `like`, `view`
- `flights`, `hotels`, `rentcar`, `tours`
- `bookings` (minimal workflow: create, list mine, confirm)
- `comment` (agent-level review/rating with purchase gate)
- `chatbot` — `askTravelAssistant` mutation: Gemini answers with live listings through read-only, validated tools
  (safe DTO mappers, identity only from the JWT, 15 requests/min, FAQ fallback when the model is unavailable)
- `board-article`, `notice` — community articles and CS notices / FAQ

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

- Node.js 20.19+
- npm 10+
- MongoDB (local or remote)

## Environment setup

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable                         | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `MONGO_DEV` / `MONGO_PROD`       | MongoDB connection strings                                      |
| `SECRET_TOKEN`                   | JWT signing secret                                              |
| `CORS_ORIGINS`                   | Allowed web origins in production                               |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI assistant; without a key it answers from the built-in FAQ    |
| `UPLOADS_DIR`                    | Persistent directory for uploaded images (served at `/uploads`) |

## Install and run

```bash
npm install
npm run start:dev
```

GraphQL endpoint: `http://localhost:3003/graphql` · Health check: `http://localhost:3003/health`

## Quality commands

```bash
# lint + compile
npm run lint
npm run build

# unit tests
npm run test

# e2e-lite suite
npm run test:e2e

# integration e2e (mongo-memory; on macOS set RUN_MONGO_MEMORY_TESTS=true)
npm run test:integration
```

## Seed commands

```bash
npm run seed:all        # members, tours, hotels, flights, rental cars
npm run seed:demo       # community articles and demo content
```

## Git hooks and CI

- `husky` + `lint-staged` run formatting/lint checks on staged files.
- GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run test -- --runInBand`
  - `npm run test:integration`
- Lint is blocking in CI (strict mode restored).

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
  - Point `UPLOADS_DIR` at a persistent volume; the directory is created on boot.
- `GET /health` returns uptime and a live MongoDB ping (`503` when the database is unreachable).
- Rate limiting: 300 requests/min per client globally, 15/min for the AI assistant (per member or IP).
- Review write policy:
  - Only `USER` can write review/rating on `AGENT`.
  - Writer must have at least one `CONFIRMED` `TOUR` booking with that agent.

## Runbook

See `docs/RUNBOOK.md` for release and incident response procedures.
See `docs/BOOKING_DEMO_FLOW.md` for the end-to-end demo scenario.
See `docs/TECH_DEBT_SCOPE.md` for separated debt handling policy.
See `docs/API_HANDOFF_CHECKLIST.md` before starting frontend integration.
See `docs/GRAPHQL_CONTRACT_OPERATIONS.md` for stable GraphQL operation contract.

## Release note

- Backend ready for portfolio release: Gemini assistant, health check, rate limiting and persistent uploads.
