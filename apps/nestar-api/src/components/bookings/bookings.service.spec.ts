import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BookingsService } from './bookings.service';
import { BookingStatus, BookingType } from '../../libs/enums/booking.enum';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('BookingsService', () => {
	let service: BookingsService;
	let bookingModel: any;
	let tourModel: any;

	beforeEach(() => {
		bookingModel = {
			create: jest.fn(),
			aggregate: jest.fn(),
			countDocuments: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		tourModel = {
			findOne: jest.fn(),
		};
		service = new BookingsService(bookingModel, tourModel);
	});

	it('creates confirmed tour booking from active tour snapshot', async () => {
		const memberId = new Types.ObjectId();
		const tourId = new Types.ObjectId();
		tourModel.findOne.mockReturnValue({
			lean: () => execMock({ _id: tourId, memberId: new Types.ObjectId(), tourTitle: 'Seoul Tour', tourPrice: 400 }),
		});
		bookingModel.create.mockResolvedValue({
			_id: new Types.ObjectId(),
			bookingType: BookingType.TOUR,
			bookingStatus: BookingStatus.PENDING,
		});

		const result = await service.createTourBooking(memberId, { tourId });
		expect(result.bookingType).toBe(BookingType.TOUR);
		expect(result.bookingStatus).toBe(BookingStatus.PENDING);
	});

	it('rejects booking when tour not found', async () => {
		const memberId = new Types.ObjectId();
		const tourId = new Types.ObjectId();
		tourModel.findOne.mockReturnValue({
			lean: () => execMock(null),
		});

		await expect(service.createTourBooking(memberId, { tourId } as any)).rejects.toBeInstanceOf(NotFoundException);
	});

	it('returns empty-safe my bookings list', async () => {
		bookingModel.aggregate.mockReturnValue(execMock([]));
		const result = await service.getMyTourBookings(new Types.ObjectId(), { page: 1, limit: 10 });
		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('checks confirmed purchase eligibility', async () => {
		bookingModel.countDocuments.mockResolvedValue(1);
		const result = await service.hasConfirmedTourBooking(new Types.ObjectId(), new Types.ObjectId().toString());
		expect(result).toBe(true);
	});

	it('throws for invalid agent id in purchase eligibility check', async () => {
		await expect(service.hasConfirmedTourBooking(new Types.ObjectId(), 'invalid')).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});

	it('confirms pending booking by admin', async () => {
		const updated = { _id: new Types.ObjectId(), bookingStatus: BookingStatus.CONFIRMED };
		bookingModel.findOneAndUpdate.mockReturnValue(execMock(updated));
		const result = await service.confirmBookingByAdmin({
			_id: updated._id,
		});
		expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);
	});
});
