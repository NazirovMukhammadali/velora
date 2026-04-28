# Velora API Runbook

## 1) Daily release checklist

1. Pull latest `develop`.
2. Run local quality gate:
   - `npm run lint`
   - `npm run build`
   - `npm run test -- --runInBand`
   - `npm run test:integration`
3. Verify environment values (`SECRET_TOKEN`, `MONGO_*`, `CORS_ORIGINS`).
4. Confirm no sensitive files are staged (`.env`, credentials).
5. Merge only green CI commits.

## 2) Deployment checklist

1. Set `NODE_ENV=production`.
2. Set production DB in `MONGO_PROD`.
3. Set strict `CORS_ORIGINS` list.
4. Apply migration or schema rollout plan (if any).
5. Deploy API build.
6. Smoke test:
   - `checkAuth`
   - `getPopularTours`
   - `createTourBooking`
   - `getMyTourBookings`
   - `confirmTourBookingByAdmin`
   - `getAgentReviewStats`

## 3) Incident triage

## API down

1. Check container/process health and restart logs.
2. Confirm DB connectivity.
3. Validate `SECRET_TOKEN` and env injection.
4. Rollback to last known healthy commit if needed.

## Booking/review gating failures

1. Validate booking records for user-agent pair:
   - `bookingType=TOUR`
   - `bookingStatus=CONFIRMED`
2. Verify review target is `AGENT` and writer is `USER`.
3. Confirm GraphQL request includes auth token.

## 4) Data repair playbook (manual)

Use a temporary script or Mongo shell:

1. Identify inconsistent bookings/comments.
2. Patch records with explicit filters.
3. Recompute affected aggregates if needed.
4. Keep audit notes with:
   - timestamp
   - operator
   - changed IDs
   - reason

## 5) Security hygiene

1. Never log tokens or raw secrets.
2. Keep Playground disabled in production.
3. Rotate `SECRET_TOKEN` if exposure is suspected.
4. Run `npm audit` during weekly maintenance windows.
