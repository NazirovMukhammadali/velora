# Booking Demo Flow (Portfolio MVP)

This document locks a simple end-to-end demo scenario for Velora.

## Goal

Show that the booking and review-gating flow works without real payments.

## Pre-conditions

- Seed data exists for tours (`npm run seed:tours`).
- At least one `USER` and one `AGENT` account exist.
- The target agent has at least one active tour package.

## Scenario

1. `USER` signs in and creates a booking via `createTourBooking`.
   - Expected booking status: `PENDING`.
2. `USER` fetches bookings via `getMyTourBookings`.
   - Expected result: created booking appears in user's list.
3. `ADMIN` confirms the booking via `confirmTourBookingByAdmin`.
   - Expected booking status transitions to `CONFIRMED`.
4. `USER` opens agent details and attempts to write a review.
   - Expected result: write is allowed only after step 3.

## Out of scope (intentional)

- Real payment provider integration.
- Refund/cancellation workflows.
- Multi-step checkout orchestration.

## Verification commands

```bash
npm run build
npm run test -- --runInBand
npm run test:e2e
npm run test:integration
```
