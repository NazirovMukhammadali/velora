# GraphQL Contract Operations (MVP)

Use this file as a stable frontend/backend contract for initial integration.

## Discovery Domains (no booking mutations)

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

### Bookings (tour-only)
- `createTourBooking(input: CreateTourBookingInput!)`
- `getMyTourBookings(input: BookingInquiry!)`
- `confirmTourBookingByAdmin(input: ConfirmBookingByAdminInput!)`

### Reviews / Gating
- `createComment(input: CommentInput!)` (requires confirmed tour booking with target agent)
- `getAgentReviewStats(agentId: String!)`

## Auth
- `signup(input: MemberInput!)`
- `login(input: LoginInput!)`
- `checkAuth()`
