import { BatchService } from './batch.service';

const modelDouble = () => {
	const updateMany = jest.fn(() => ({ exec: async () => ({ acknowledged: true }) }));
	return { updateMany };
};

const build = () => {
	const m = {
		hotel: modelDouble(),
		tour: modelDouble(),
		rentcar: modelDouble(),
		flight: modelDouble(),
		member: modelDouble(),
	};
	const service = new BatchService(m.hotel as any, m.tour as any, m.rentcar as any, m.flight as any, m.member as any);
	return { service, m };
};

describe('BatchService', () => {
	it('ranks every active catalog as likes × 2 + views in a single pipeline update', async () => {
		const { service, m } = build();
		await service.batchTopListings();
		const [filter, pipeline] = m.hotel.updateMany.mock.calls[0] as any[];
		expect(filter).toEqual({ hotelStatus: 'ACTIVE' });
		expect(pipeline).toEqual([
			{
				$set: {
					hotelRank: {
						$add: [{ $multiply: [{ $ifNull: ['$hotelLikes', 0] }, 2] }, { $ifNull: ['$hotelViews', 0] }],
					},
				},
			},
		]);
		expect((m.tour.updateMany.mock.calls[0] as any[])[0]).toEqual({ tourStatus: 'ACTIVE' });
		expect((m.rentcar.updateMany.mock.calls[0] as any[])[0]).toEqual({ rentcarStatus: 'ACTIVE' });
		expect((m.flight.updateMany.mock.calls[0] as any[])[0]).toEqual({ flightStatus: 'ACTIVE' });
		expect(m.member.updateMany).not.toHaveBeenCalled();
	});

	it('ranks only active agents', async () => {
		const { service, m } = build();
		await service.batchTopAgents();
		const [filter, pipeline] = m.member.updateMany.mock.calls[0] as any[];
		expect(filter).toEqual({ memberType: 'AGENT', memberStatus: 'ACTIVE' });
		expect(pipeline[0].$set.memberRank.$add).toHaveLength(4);
	});
});
