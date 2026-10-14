/**
 * Safe DTOs: the ONLY shapes the model ever sees. Each mapper copies an explicit whitelist of
 * public catalog fields — no member contact data, passwords, internal counters or booking ids.
 * Catalog item ids are public (they appear in site URLs), so they are kept for linking.
 */

type Doc = Record<string, any>;

const dateOnly = (value: unknown): string | undefined =>
	value ? new Date(value as string).toISOString().slice(0, 10) : undefined;

const isoMinute = (value: unknown): string | undefined =>
	value ? new Date(value as string).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : undefined;

export type SafeHotel = ReturnType<typeof toSafeHotel>;
export const toSafeHotel = (hotel: Doc) => ({
	name: String(hotel.hotelName ?? ''),
	city: String(hotel.hotelLocation ?? ''),
	address: String(hotel.hotelAddress ?? ''),
	stars: Number(hotel.hotelStars ?? 0),
	pricePerNightUsd: Number(hotel.hotelPrice ?? 0),
	roomsAvailable: Number(hotel.availableRooms ?? 0),
	url: `/package/detail?type=hotels&id=${String(hotel._id)}`,
});

export type SafeTour = ReturnType<typeof toSafeTour>;
export const toSafeTour = (tour: Doc) => ({
	title: String(tour.tourTitle ?? ''),
	location: String(tour.tourLocation ?? ''),
	days: Number(tour.tourDays ?? 0),
	nights: Number(tour.tourNights ?? 0),
	priceUsd: Number(tour.tourPrice ?? 0),
	agent: tour.agentName ? String(tour.agentName) : undefined,
	url: `/package/detail?type=tours&id=${String(tour._id)}`,
});

export type SafeRentcar = ReturnType<typeof toSafeRentcar>;
export const toSafeRentcar = (car: Doc) => ({
	model: String(car.carTitle ?? ''),
	city: String(car.carLocation ?? ''),
	category: String(car.carCategory ?? ''),
	transmission: String(car.transmission ?? ''),
	seats: Number(car.seats ?? 0),
	pricePerDayUsd: Number(car.dailyPrice ?? 0),
	url: `/package/detail?type=cars&id=${String(car._id)}`,
});

export type SafeFlight = ReturnType<typeof toSafeFlight>;
export const toSafeFlight = (flight: Doc) => ({
	airline: String(flight.airline ?? ''),
	flightNumber: String(flight.flightNumber ?? ''),
	from: String(flight.departureAirport ?? ''),
	to: String(flight.arrivalAirport ?? ''),
	departure: isoMinute(flight.departureTime),
	arrival: isoMinute(flight.arrivalTime),
	cabinClass: String(flight.cabinClass ?? ''),
	seatsLeft: Number(flight.availableSeats ?? 0),
	priceUsd: Number(flight.basePrice ?? 0),
	url: `/flights/detail?id=${String(flight._id)}`,
});

/** The caller's own booking, minus every identifier (booking, member, agent, reference ids). */
export type SafeBooking = ReturnType<typeof toSafeBooking>;
export const toSafeBooking = (booking: Doc) => ({
	type: String(booking.bookingType ?? ''),
	title: String(booking.bookingTitle ?? ''),
	status: String(booking.bookingStatus ?? ''),
	totalUsd: Number(booking.bookingPrice ?? 0),
	checkIn: dateOnly(booking.checkInDate),
	checkOut: dateOnly(booking.checkOutDate),
	quantity: booking.quantity ? Number(booking.quantity) : undefined,
	bookedOn: dateOnly(booking.createdAt),
});
