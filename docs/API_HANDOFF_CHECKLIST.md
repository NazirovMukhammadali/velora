# API Handoff Checklist (Frontend Integration)

Use this checklist before connecting `velora-web` to `velora-api`.

## 1) Environment and runtime

- [ ] `.env` is created from `.env.example`
- [ ] API starts locally (`npm run start:dev`)
- [ ] GraphQL endpoint responds at `http://localhost:3003/graphql`
- [ ] Seed data is loaded for flights/hotels/rentcar/tours

## 2) Locked product rules

- [ ] Primary search tabs: `Flights`, `Hotels`, `Rentcar` only
- [ ] `Tours` stay in agent flow (not primary tab)
- [ ] `Flights/Hotels/Rentcar` are discovery-only (`search`, `list`, `detail`) and must not call booking mutations
- [ ] Booking status lifecycle: `PENDING` -> `CONFIRMED`
- [ ] No real payment integration in this MVP
- [ ] Review write access requires `CONFIRMED` tour booking

## 3) Must-pass validation before handoff

- [ ] `npm run build`
- [ ] `npm run test -- bookings.service.spec.ts comment.service.spec.ts --runInBand`
- [ ] `npm run test:e2e`
- [ ] `npm run test:integration` (expected skip on local darwin)

## 4) GraphQL operations frontend needs first

### Discovery domains (no booking mutations)
#### Flights
- `getFlights`
- `getFlightDetail`

#### Hotels
- `getHotels`
- `getHotelDetail`

#### Rentcar
- `getRentcars`
- `getRentcarDetail`

### Booking
- **Tour-only** booking contract:
  - Do not implement/use `createFlightBooking`, `createHotelBooking`, `createRentcarBooking`
- `createTourBooking`
- `getMyTourBookings`
- `confirmTourBookingByAdmin` (admin panel side)

### Agent/tours
- `getPopularTours`
- `getAgentTours`
- `getAgentReviewStats`

### Auth and member
- `signup`
- `login`
- `checkAuth`
- `getAgents`

## 5) Integration notes

- Keep API contract stable during frontend wiring.
- Avoid cross-cutting refactors while frontend is integrating.
- Defer global lint debt cleanup to dedicated technical debt phase.
- Keep CI build/test checks blocking; lint remains temporarily non-blocking.
