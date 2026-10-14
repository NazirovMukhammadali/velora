import { Types } from 'mongoose';
import { ChatbotToolsService } from './chatbot-tools.service';
import { toSafeBooking, toSafeTour } from './safe-mappers';

/** Minimal chainable Mongoose query double that records the filter and limit it received. */
const modelDouble = (docs: Record<string, unknown>[] = []) => {
	const calls: { filter?: unknown; limit?: number } = {};
	const query: any = {
		sort: () => query,
		limit: (n: number) => ((calls.limit = n), query),
		select: () => query,
		lean: () => query,
		exec: async () => docs,
	};
	return {
		calls,
		model: {
			find: (filter: unknown) => ((calls.filter = filter), query),
			aggregate: () => ({ exec: async () => docs }),
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
		expect(filter.hotelLocation.$regex.source).toBe('Se\\.\\*oul');
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
