import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FlightsService } from './flights.service';
import { FlightStatus } from '../../libs/enums/flight.enum';
import { ViewGroup } from '../../libs/enums/view.enum';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('FlightsService', () => {
	let service: FlightsService;
	let flightModel: any;
	let likeService: any;
	let viewService: any;

	beforeEach(() => {
		flightModel = {
			create: jest.fn(),
			aggregate: jest.fn(),
			findOne: jest.fn(),
			findByIdAndUpdate: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		likeService = {
			toggleLike: jest.fn(),
			checkLikeExistence: jest.fn(),
			getFavoriteFlights: jest.fn(),
		};
		viewService = {
			recordView: jest.fn(),
		};

		service = new FlightsService(flightModel, likeService, viewService);
	});

	it('rejects invalid airport pair on create', async () => {
		await expect(
			service.createFlight({
				departureAirport: 'TAS',
				arrivalAirport: 'TAS',
				departureTime: new Date('2030-01-01T08:00:00Z'),
				arrivalTime: new Date('2030-01-01T12:00:00Z'),
			} as any),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('returns empty-safe flights list', async () => {
		flightModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getFlights({ page: 1, limit: 10, search: {} });

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('records view and liked state in detail', async () => {
		const memberId = new Types.ObjectId();
		const foundFlight = {
			_id: new Types.ObjectId(),
			flightViews: 4,
			flightStatus: FlightStatus.ACTIVE,
		};

		flightModel.findOne.mockReturnValue({
			lean: () => ({
				exec: jest.fn().mockResolvedValue(foundFlight),
			}),
		});
		viewService.recordView.mockResolvedValue({ _id: new Types.ObjectId(), viewGroup: ViewGroup.FLIGHT });
		flightModel.findByIdAndUpdate.mockReturnValue(execMock({ ...foundFlight, flightViews: 5 }));
		likeService.checkLikeExistence.mockResolvedValue([{ myFavorite: true }]);

		const result = await service.getFlightDetail(memberId, new Types.ObjectId().toString());

		expect(result.flightViews).toBe(5);
		expect(result.meLiked[0].myFavorite).toBe(true);
	});

	it('throws if like target flight missing', async () => {
		flightModel.findOne.mockReturnValue(execMock(null));

		await expect(service.likeTargetFlight(new Types.ObjectId(), new Types.ObjectId() as any)).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('updates flight by admin with validation', async () => {
		const _id = new Types.ObjectId();
		const existing = {
			_id,
			departureAirport: 'TAS',
			arrivalAirport: 'DXB',
			departureTime: new Date('2030-01-01T08:00:00Z'),
			arrivalTime: new Date('2030-01-01T12:00:00Z'),
			flightStatus: FlightStatus.ACTIVE,
		};
		flightModel.findOne.mockReturnValue(execMock(existing));
		flightModel.findOneAndUpdate.mockReturnValue(execMock({ ...existing, airline: 'Updated Air' }));

		const result = await service.updateFlightByAdmin({ _id, airline: 'Updated Air' });

		expect(result.airline).toBe('Updated Air');
	});

	it('rejects setting DELETE via update endpoint', async () => {
		await expect(
			service.updateFlightByAdmin({ _id: new Types.ObjectId(), flightStatus: FlightStatus.DELETE } as any),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('soft deletes flight by admin', async () => {
		const _id = new Types.ObjectId();
		flightModel.findOneAndUpdate.mockReturnValue(execMock({ _id, flightStatus: FlightStatus.DELETE }));

		const result = await service.removeFlightByAdmin(_id);

		expect(result.flightStatus).toBe(FlightStatus.DELETE);
	});
});
