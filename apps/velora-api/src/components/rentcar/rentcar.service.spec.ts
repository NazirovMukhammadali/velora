import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RentcarService } from './rentcar.service';
import { RentcarStatus } from '../../libs/enums/rentcar.enum';
import { ViewGroup } from '../../libs/enums/view.enum';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('RentcarService', () => {
	let service: RentcarService;
	let rentcarModel: any;
	let likeService: any;
	let viewService: any;

	beforeEach(() => {
		rentcarModel = {
			create: jest.fn(),
			aggregate: jest.fn(),
			findOne: jest.fn(),
			findByIdAndUpdate: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		likeService = {
			toggleLike: jest.fn(),
			checkLikeExistence: jest.fn(),
			getFavoriteRentcars: jest.fn(),
		};
		viewService = {
			recordView: jest.fn(),
		};

		service = new RentcarService(rentcarModel, likeService, viewService);
	});

	it('creates rentcar successfully', async () => {
		const created = { _id: new Types.ObjectId(), carTitle: 'Velora SUV' };
		rentcarModel.create.mockResolvedValue(created);

		const result = await service.createRentcar({
			carTitle: 'Velora SUV',
			carLocation: 'Dubai',
			carCategory: 'SUV',
			seats: 5,
			dailyPrice: 99,
			carImages: ['img'],
		} as any);

		expect(result).toEqual(created);
	});

	it('returns empty-safe rentcar list', async () => {
		rentcarModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getRentcars({ page: 1, limit: 10, search: {} });

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('records view and liked state in detail', async () => {
		const memberId = new Types.ObjectId();
		const found = {
			_id: new Types.ObjectId(),
			rentcarViews: 2,
			rentcarStatus: RentcarStatus.ACTIVE,
		};
		rentcarModel.findOne.mockReturnValue({
			lean: () => ({
				exec: jest.fn().mockResolvedValue(found),
			}),
		});
		viewService.recordView.mockResolvedValue({ _id: new Types.ObjectId(), viewGroup: ViewGroup.RENTCAR });
		rentcarModel.findByIdAndUpdate.mockReturnValue(execMock({ ...found, rentcarViews: 3 }));
		likeService.checkLikeExistence.mockResolvedValue([{ myFavorite: true }]);

		const result = await service.getRentcarDetail(memberId, new Types.ObjectId().toString());

		expect(result.rentcarViews).toBe(3);
		expect(result.meLiked[0].myFavorite).toBe(true);
	});

	it('throws if like target not found', async () => {
		rentcarModel.findOne.mockReturnValue(execMock(null));

		await expect(service.likeTargetRentcar(new Types.ObjectId(), new Types.ObjectId() as any)).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('delegates favorite rentcars query', async () => {
		const expected = { list: [{ _id: new Types.ObjectId() }], metaCounter: [{ total: 1 }] };
		likeService.getFavoriteRentcars.mockResolvedValue(expected);

		const result = await service.getFavoriteRentcars(new Types.ObjectId(), { page: 1, limit: 10 });

		expect(result).toEqual(expected);
	});

	it('updates rentcar by admin', async () => {
		const updated = { _id: new Types.ObjectId(), carTitle: 'Updated' };
		rentcarModel.findOneAndUpdate.mockReturnValue(execMock(updated));

		const result = await service.updateRentcarByAdmin({ _id: updated._id, carTitle: 'Updated' });

		expect(result).toEqual(updated);
	});

	it('throws on failed remove by admin', async () => {
		rentcarModel.findOneAndUpdate.mockReturnValue(execMock(null));

		await expect(service.removeRentcarByAdmin(new Types.ObjectId() as any)).rejects.toBeInstanceOf(BadRequestException);
	});
});
