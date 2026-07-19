# GraphQL Contract Operations (MVP)

Use this file as a stable frontend/backend contract for initial integration.

## Contract status

- Contract frozen for frontend integration.
- Breaking changes are not allowed in listed operations until frontend MVP handoff is complete.

## Discovery Domains (catalog)

> Hotels support booking mutations listed under Bookings. Flight/Rentcar remain discovery-only until later stages.

## Discovery Domains (legacy note)

### Flights
- `getFlights(input: FlightsInquiry!)`
- `getFlightDetail(flightId: ID!)`

### Hotels
- `getHotels(input: HotelsInquiry!)`
- `getHotelDetail(hotelId: ID!)`

### Rentcar
- `getRentcars(input: RentcarsInquiry!)`
- `getRentcarDetail(rentcarId: ID!)`

## Transactional Domain (Tours + Bookings)

### Tours
- `createTour(input: TourInput!)` (agent)
- `getTours(input: ToursInquiry!)`
- `getAgentTours(agentId: String!, input: AgentToursInquiry!)`
- `getTourDetail(tourId: ID!)`

### Bookings (tour + hotel)
- `createTourBooking(input: CreateTourBookingInput!)`
- `getMyTourBookings(input: BookingInquiry!)`
- `confirmTourBookingByAdmin(input: ConfirmBookingByAdminInput!)`
- `createHotelBooking(input: CreateHotelBookingInput!)`
- `getMyHotelBookings(input: BookingInquiry!)`
- `confirmHotelBookingByAdmin(input: ConfirmBookingByAdminInput!)`
- `cancelHotelBookingByAdmin(input: CancelBookingByAdminInput!)`

### Reviews / Gating
- `createComment(input: CommentInput!)` (requires confirmed tour booking with target agent)
- `getAgentReviewStats(agentId: String!)`

## Auth
- `signup(input: MemberInput!)`
- `login(input: LoginInput!)`
- `checkAuth()`
