import { Types } from 'mongoose';
import { ChatbotToolsService } from './chatbot-tools.service';
import { toSafeBooking, toSafeTour } from './safe-mappers';

/**
 * Minimal chainable Mongoose query double. `docs` is returned for every query, or pass one array per
 * query (in call order) to simulate fallbacks. Records the first filter, every filter and the limit.
 */
const modelDouble = (docs: Record<string, unknown>[] | Record<string, unknown>[][] = []) => {
	const perCall = Array.isArray(docs[0]) ? (docs as Record<string, unknown>[][]) : null;
	const calls: { filter?: unknown; filters: unknown[]; limit?: number } = { filters: [] };
	const next = async () => (perCall ? (perCall[calls.filters.length - 1] ?? []) : docs);
	const record = (filter: unknown) => {
		if (calls.filter === undefined) calls.filter = filter;
		calls.filters.push(filter);
	};
	const query: any = {
		sort: () => query,
		limit: (n: number) => ((calls.limit = n), query),
		select: () => query,
		lean: () => query,
		exec: next,
	};
	return {
		calls,
		model: {
			find: (filter: unknown) => (record(filter), query),
			aggregate: (pipeline: any[]) => (record(pipeline[0].$match), { exec: next }),
		},
	};
};

const build = (
	overrides: Partial<Record<'hotel' | 'tour' | 'rentcar' | 'flight' | 'booking', ReturnType<typeof modelDouble>>> = {},
) => {
	const m = {
		hotel: modelDouble(),
		tour: modelDouble(),
		rentcar: modelDouble(),
		flight: modelDouble(),
		booking: modelDouble(),
		...overrides,
	};
	const service = new ChatbotToolsService(
		m.hotel.model as any,
		m.tour.model as any,
		m.rentcar.model as any,
		m.flight.model as any,
		m.booking.model as any,
	);
	return { service, m };
};

describe('ChatbotToolsService', () => {
	it('rejects limits above 20 and unknown arguments before querying', async () => {
		const { service, m } = build();
		const tooMany = await service.execute('search_hotels', { limit: 50 }, { memberId: null });
		const unknown = await service.execute('search_hotels', { city: 'Seoul', $where: 'sleep(1)' }, { memberId: null });
		expect(tooMany.output.error).toBe('invalid_arguments');
		expect(unknown.output.error).toBe('invalid_arguments');
		expect(m.hotel.calls.filter).toBeUndefined();
	});

	it('escapes regex input and only queries active listings', async () => {
		const { service, m } = build();
		await service.execute('search_hotels', { city: 'Se.*oul', maxPrice: 200, limit: 3 }, { memberId: null });
		const filter = m.hotel.calls.filter as any;
		expect(filter.hotelStatus).toBe('ACTIVE');
		expect(filter.hotelLocation).toEqual({ $regex: 'Se\\.\\*oul', $options: 'i' });
		expect(m.hotel.calls.limit).toBe(3);
	});

	it('maps city names to airport codes for flights', async () => {
		const { service, m } = build();
		await service.execute('search_flights', { from: 'tashkent', to: 'ICN' }, { memberId: null });
		const filter = m.flight.calls.filter as any;
		expect(filter.departureAirport).toEqual({ $in: ['TAS'] });
		expect(filter.arrivalAirport).toEqual({ $in: ['ICN'] });
		expect(filter.departureTime.$gt).toBeInstanceOf(Date);
	});

	it('requires a signed-in member for bookings and scopes the query to that member', async () => {
		const memberId = new Types.ObjectId();
		const booking = modelDouble([
			{
				_id: new Types.ObjectId(),
				memberId,
				agentId: new Types.ObjectId(),
				bookingTitle: 'Seoul Food Tour',
				bookingStatus: 'PENDING',
				bookingPrice: 120,
			},
		]);
		const { service } = build({ booking });

		expect((await service.execute('get_my_bookings', {}, { memberId: null })).output).toEqual({
			error: 'login_required',
		});
		const mine = await service.execute('get_my_bookings', {}, { memberId });
		expect(booking.calls.filter).toEqual({ memberId });
		expect(JSON.stringify(mine.output)).not.toMatch(/memberId|agentId|_id/);
	});

	it('trims and tolerates extra whitespace / a trailing country in place names', async () => {
		const { service, m } = build();
		await service.execute('search_hotels', { city: '  new   york , USA ' }, { memberId: null });
		const regex = (m.hotel.calls.filter as any).hotelLocation;
		expect(regex).toEqual({ $regex: 'new\\s+york', $options: 'i' });
		expect(new RegExp(regex.$regex, regex.$options).test('New  York')).toBe(true);
	});

	it('relaxes price filters before giving up on the requested city', async () => {
		const seoul = { _id: 'h1', hotelName: 'Hanok Stay', hotelLocation: 'Seoul', hotelPrice: 180 };
		const hotel = modelDouble([[], [seoul]]);
		const { service } = build({ hotel });
		const res = await service.execute('search_hotels', { city: 'Seoul', maxPrice: 20 }, { memberId: null });
		expect(hotel.calls.filters).toHaveLength(2);
		expect(hotel.calls.filters[1]).not.toHaveProperty('hotelPrice');
		expect(res.output).toMatchObject({ match: 'relaxed', count: 1 });
		expect(res.sources.map((s) => s.title)).toEqual(['Hanok Stay']);
	});

	it('falls back to popular active listings when nothing matches the place', async () => {
		const popular = { _id: 't9', tourTitle: 'Rome Ancient Wonders', tourLocation: 'Rome', tourPrice: 540 };
		const tour = modelDouble([[], [], [popular]]);
		const { service } = build({ tour });
		const res = await service.execute('search_tours', { location: 'Atlantis', maxDays: 2 }, { memberId: null });
		expect(tour.calls.filters[2]).toEqual({ tourStatus: 'ACTIVE' });
		expect(res.output).toMatchObject({ match: 'popular', count: 1 });
		expect(res.output.note).toMatch(/popular alternatives/);
		expect(res.sources).toHaveLength(1);
	});

	it('suggests the return leg, then flights touching the requested airports, before any flight', async () => {
		const flight = modelDouble([
			[],
			[],
			[{ _id: 'f1', flightNumber: 'VA1', departureAirport: 'TAS', arrivalAirport: 'ICN' }],
		]);
		const { service } = build({ flight });
		const res = await service.execute('search_flights', { from: 'Seoul', to: 'Tashkent' }, { memberId: null });
		// No extra filters, so the strict and route-only queries are identical and run once.
		expect(flight.calls.filters[1]).toMatchObject({
			departureAirport: { $in: ['TAS'] },
			arrivalAirport: { $in: ['ICN'] },
		});
		expect((flight.calls.filters[2] as any).$or).toEqual([
			{ departureAirport: { $in: ['ICN', 'TAS'] } },
			{ arrivalAirport: { $in: ['ICN', 'TAS'] } },
		]);
		expect(res.output.match).toBe('relaxed');
	});

	it('does not repeat identical queries when there are no filters to relax', async () => {
		const rentcar = modelDouble([[]]);
		const { service } = build({ rentcar });
		const res = await service.execute('search_rentcars', {}, { memberId: null });
		expect(rentcar.calls.filters).toHaveLength(1);
		expect(res.output).toEqual({ match: 'exact', count: 0, results: [] });
	});

	it('returns an error object for unknown tools', async () => {
		const { service } = build();
		expect((await service.execute('drop_database', {}, { memberId: null })).output).toEqual({ error: 'unknown_tool' });
	});
});

describe('safe mappers', () => {
	it('never copy fields outside the whitelist', () => {
		const tour = toSafeTour({
			_id: 't1',
			tourTitle: 'Seoul',
			memberPassword: 'x',
			memberPhone: '+998',
			tourSoldCount: 9,
		});
		expect(Object.keys(tour).sort()).toEqual(['agent', 'days', 'location', 'nights', 'priceUsd', 'title', 'url']);
		const booking = toSafeBooking({ _id: 'b1', memberId: 'm', agentId: 'a', bookingRefId: 'r', bookingTitle: 'x' });
		expect(JSON.stringify(booking)).not.toMatch(/b1|"m"|"a"|"r"/);
	});
});
