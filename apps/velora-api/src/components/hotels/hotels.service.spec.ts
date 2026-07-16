import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HotelsService } from './hotels.service';
import { HotelStatus } from '../../libs/enums/hotel.enum';
import { ViewGroup } from '../../libs/enums/view.enum';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('HotelsService', () => {
	let service: HotelsService;
	let hotelModel: any;
	let likeService: any;
	let viewService: any;

	beforeEach(() => {
		hotelModel = {
			create: jest.fn(),
			aggregate: jest.fn(),
			findOne: jest.fn(),
			findByIdAndUpdate: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		likeService = {
			toggleLike: jest.fn(),
			checkLikeExistence: jest.fn(),
			getFavoriteHotels: jest.fn(),
		};
		viewService = {
			recordView: jest.fn(),
		};

		service = new HotelsService(hotelModel, likeService, viewService);
	});

	it('creates hotel successfully', async () => {
		const created = { _id: new Types.ObjectId(), hotelName: 'Velora Stay' };
		hotelModel.create.mockResolvedValue(created);

		const result = await service.createHotel({
			hotelName: 'Velora Stay',
			hotelLocation: 'Tashkent',
			hotelAddress: 'Main street',
			hotelPrice: 100,
			hotelStars: 4,
			hotelImages: ['img'],
		});

		expect(result).toEqual(created);
	});

	it('returns empty-safe hotel listing', async () => {
		hotelModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getHotels({ page: 1, limit: 10, search: {} });

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('records view and returns meLiked in detail', async () => {
		const memberId = new Types.ObjectId();
		const foundHotel = {
			_id: new Types.ObjectId(),
			hotelViews: 2,
			hotelStatus: HotelStatus.ACTIVE,
		};

		hotelModel.findOne.mockReturnValue({
			lean: () => ({
				exec: jest.fn().mockResolvedValue(foundHotel),
			}),
		});
		viewService.recordView.mockResolvedValue({ _id: new Types.ObjectId(), viewGroup: ViewGroup.HOTEL });
		hotelModel.findByIdAndUpdate.mockReturnValue(execMock({ ...foundHotel, hotelViews: 3 }));
		likeService.checkLikeExistence.mockResolvedValue([{ myFavorite: true }]);

		const result = await service.getHotelDetail(memberId, new Types.ObjectId().toString());

		expect(viewService.recordView).toHaveBeenCalled();
		expect(result.hotelViews).toBe(3);
		expect(result.meLiked).toEqual([{ myFavorite: true }]);
	});

	it('toggles like on active hotel', async () => {
		const hotelId = new Types.ObjectId();
		hotelModel.findOne.mockReturnValue(execMock({ _id: hotelId, hotelStatus: HotelStatus.ACTIVE }));
		likeService.toggleLike.mockResolvedValue(1);
		hotelModel.findByIdAndUpdate.mockReturnValue(execMock({ _id: hotelId, hotelLikes: 4 }));

		const result = await service.likeTargetHotel(new Types.ObjectId(), hotelId);

		expect(result.hotelLikes).toBe(4);
	});

	it('throws if like target hotel does not exist', async () => {
		hotelModel.findOne.mockReturnValue(execMock(null));

		await expect(service.likeTargetHotel(new Types.ObjectId(), new Types.ObjectId() as any)).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('delegates favorite hotels query', async () => {
		const expected = { list: [{ _id: new Types.ObjectId() }], metaCounter: [{ total: 1 }] };
		likeService.getFavoriteHotels.mockResolvedValue(expected);

		const result = await service.getFavoriteHotels(new Types.ObjectId(), { page: 1, limit: 10 });

		expect(result).toEqual(expected);
	});

	it('updates hotel by admin', async () => {
		const updated = { _id: new Types.ObjectId(), hotelName: 'Updated' };
		hotelModel.findOneAndUpdate.mockReturnValue(execMock(updated));

		const result = await service.updateHotelByAdmin({ _id: updated._id, hotelName: 'Updated' });

		expect(result).toEqual(updated);
	});

	it('throws on failed remove by admin', async () => {
		hotelModel.findOneAndUpdate.mockReturnValue(execMock(null));

		await expect(service.removeHotelByAdmin(new Types.ObjectId() as any)).rejects.toBeInstanceOf(BadRequestException);
	});
});
