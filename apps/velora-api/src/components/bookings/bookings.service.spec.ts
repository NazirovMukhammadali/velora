import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BookingsService } from './bookings.service';
import { BookingStatus, BookingType } from '../../libs/enums/booking.enum';
import { HotelStatus } from '../../libs/enums/hotel.enum';
import { MemberType } from '../../libs/enums/member.enum';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

const tomorrowIso = () => {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
};

const dayAfterTomorrowIso = () => {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + 2);
	return d.toISOString().slice(0, 10);
};

describe('BookingsService', () => {
	let service: BookingsService;
	let bookingModel: any;
	let tourModel: any;
	let hotelModel: any;
	let memberModel: any;
	let connection: any;

	beforeEach(() => {
		bookingModel = {
			create: jest.fn(),
			aggregate: jest.fn(),
			countDocuments: jest.fn(),
			findOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
			findByIdAndUpdate: jest.fn(),
		};
		tourModel = {
			findOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		hotelModel = {
			findOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		memberModel = {
			findOne: jest.fn(),
		};
		connection = {
			startSession: jest.fn(),
		};
		service = new BookingsService(bookingModel, tourModel, hotelModel, memberModel, connection);
	});

	it('creates pending tour booking from active tour snapshot', async () => {
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
		const updated = {
			_id: new Types.ObjectId(),
			bookingRefId: new Types.ObjectId(),
			bookingStatus: BookingStatus.CONFIRMED,
		};
		bookingModel.findOneAndUpdate.mockReturnValue(execMock(updated));
		tourModel.findOneAndUpdate.mockReturnValue(execMock({ _id: updated.bookingRefId, tourSoldCount: 3 }));
		const result = await service.confirmBookingByAdmin({
			_id: updated._id,
		});
		expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);
	});

	it('rolls booking status back if tour counter update fails', async () => {
		const updated = {
			_id: new Types.ObjectId(),
			bookingRefId: new Types.ObjectId(),
			bookingStatus: BookingStatus.CONFIRMED,
		};
		bookingModel.findOneAndUpdate.mockReturnValue(execMock(updated));
		tourModel.findOneAndUpdate.mockReturnValue(execMock(null));
		bookingModel.findByIdAndUpdate.mockReturnValue(execMock({}));

		await expect(service.confirmBookingByAdmin({ _id: updated._id } as any)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(bookingModel.findByIdAndUpdate).toHaveBeenCalledWith(updated._id, {
			bookingStatus: BookingStatus.PENDING,
		});
	});

	describe('hotel bookings', () => {
		const adminId = new Types.ObjectId();

		const mockAdminLookup = () => {
			memberModel.findOne.mockReturnValue({
				select: () => ({
					lean: () => execMock({ _id: adminId, memberType: MemberType.ADMIN }),
				}),
			});
		};

		it('creates pending hotel booking with price snapshot', async () => {
			const memberId = new Types.ObjectId();
			const hotelId = new Types.ObjectId();
			hotelModel.findOne.mockReturnValue({
				lean: () =>
					execMock({
						_id: hotelId,
						hotelName: 'Riad Atlas',
						hotelPrice: 100,
						availableRooms: 5,
						hotelStatus: HotelStatus.ACTIVE,
					}),
			});
			bookingModel.countDocuments.mockReturnValue(execMock(0));
			mockAdminLookup();
			bookingModel.create.mockResolvedValue({
				_id: new Types.ObjectId(),
				bookingType: BookingType.HOTEL,
				bookingStatus: BookingStatus.PENDING,
				bookingPrice: 200,
				quantity: 2,
			});

			const result = await service.createHotelBooking(memberId, {
				hotelId,
				checkInDate: tomorrowIso(),
				checkOutDate: dayAfterTomorrowIso(),
				quantity: 2,
			} as any);

			expect(result.bookingType).toBe(BookingType.HOTEL);
			expect(bookingModel.create).toHaveBeenCalledWith(
				expect.objectContaining({
					bookingType: BookingType.HOTEL,
					bookingStatus: BookingStatus.PENDING,
					bookingPrice: 200,
					quantity: 2,
					agentId: adminId,
				}),
			);
		});

		it('rejects hotel booking when hotel inactive/missing', async () => {
			hotelModel.findOne.mockReturnValue({ lean: () => execMock(null) });
			await expect(
				service.createHotelBooking(new Types.ObjectId(), {
					hotelId: new Types.ObjectId(),
					checkInDate: tomorrowIso(),
					checkOutDate: dayAfterTomorrowIso(),
				} as any),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('rejects hotel booking when not enough rooms', async () => {
			hotelModel.findOne.mockReturnValue({
				lean: () =>
					execMock({
						_id: new Types.ObjectId(),
						hotelName: 'Small Inn',
						hotelPrice: 80,
						availableRooms: 1,
						hotelStatus: HotelStatus.ACTIVE,
					}),
			});
			await expect(
				service.createHotelBooking(new Types.ObjectId(), {
					hotelId: new Types.ObjectId(),
					checkInDate: tomorrowIso(),
					checkOutDate: dayAfterTomorrowIso(),
					quantity: 3,
				} as any),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('rejects invalid hotel dates', async () => {
			await expect(
				service.createHotelBooking(new Types.ObjectId(), {
					hotelId: new Types.ObjectId(),
					checkInDate: dayAfterTomorrowIso(),
					checkOutDate: tomorrowIso(),
				} as any),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('rejects overlapping duplicate hotel booking', async () => {
			hotelModel.findOne.mockReturnValue({
				lean: () =>
					execMock({
						_id: new Types.ObjectId(),
						hotelName: 'Riad',
						hotelPrice: 90,
						availableRooms: 4,
						hotelStatus: HotelStatus.ACTIVE,
					}),
			});
			bookingModel.countDocuments.mockReturnValue(execMock(1));
			await expect(
				service.createHotelBooking(new Types.ObjectId(), {
					hotelId: new Types.ObjectId(),
					checkInDate: tomorrowIso(),
					checkOutDate: dayAfterTomorrowIso(),
				} as any),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('returns empty-safe hotel booking list', async () => {
			bookingModel.aggregate.mockReturnValue(execMock([]));
			const result = await service.getMyHotelBookings(new Types.ObjectId(), { page: 1, limit: 10 });
			expect(result.list).toEqual([]);
			expect(result.metaCounter[0].total).toBe(0);
		});

		it('confirms hotel booking in a transaction and decrements rooms', async () => {
			const bookingId = new Types.ObjectId();
			const hotelId = new Types.ObjectId();
			const pending = {
				_id: bookingId,
				bookingRefId: hotelId,
				bookingStatus: BookingStatus.PENDING,
				quantity: 2,
			};
			const confirmed = { ...pending, bookingStatus: BookingStatus.CONFIRMED };

			const session = {
				withTransaction: jest.fn(async (fn) => fn()),
				endSession: jest.fn(),
			};
			connection.startSession.mockResolvedValue(session);

			bookingModel.findOne.mockReturnValue({
				session: () => execMock(pending),
			});
			hotelModel.findOneAndUpdate.mockReturnValue(execMock({ _id: hotelId, availableRooms: 3 }));
			bookingModel.findOneAndUpdate.mockReturnValue(execMock(confirmed));

			const result = await service.confirmHotelBookingByAdmin({ _id: bookingId } as any);
			expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);
			expect(hotelModel.findOneAndUpdate).toHaveBeenCalled();
			expect(session.endSession).toHaveBeenCalled();
		});

		it('cancels pending hotel booking without touching rooms', async () => {
			const bookingId = new Types.ObjectId();
			bookingModel.findOne.mockReturnValue(
				execMock({
					_id: bookingId,
					bookingStatus: BookingStatus.PENDING,
					bookingType: BookingType.HOTEL,
					quantity: 1,
				}),
			);
			bookingModel.findOneAndUpdate.mockReturnValue(
				execMock({ _id: bookingId, bookingStatus: BookingStatus.CANCELLED }),
			);

			const result = await service.cancelHotelBookingByAdmin({ _id: bookingId } as any);
			expect(result.bookingStatus).toBe(BookingStatus.CANCELLED);
			expect(connection.startSession).not.toHaveBeenCalled();
		});

		it('cancels confirmed hotel booking and restores rooms', async () => {
			const bookingId = new Types.ObjectId();
			const hotelId = new Types.ObjectId();
			bookingModel.findOne.mockReturnValue(
				execMock({
					_id: bookingId,
					bookingRefId: hotelId,
					bookingStatus: BookingStatus.CONFIRMED,
					bookingType: BookingType.HOTEL,
					quantity: 2,
				}),
			);

			const session = {
				withTransaction: jest.fn(async (fn) => fn()),
				endSession: jest.fn(),
			};
			connection.startSession.mockResolvedValue(session);
			bookingModel.findOneAndUpdate.mockReturnValue(
				execMock({ _id: bookingId, bookingStatus: BookingStatus.CANCELLED }),
			);
			hotelModel.findOneAndUpdate.mockReturnValue(execMock({ _id: hotelId, availableRooms: 5 }));

			const result = await service.cancelHotelBookingByAdmin({ _id: bookingId } as any);
			expect(result.bookingStatus).toBe(BookingStatus.CANCELLED);
			expect(hotelModel.findOneAndUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ _id: hotelId }),
				{ $inc: { availableRooms: 2 } },
				expect.any(Object),
			);
		});
	});
});
