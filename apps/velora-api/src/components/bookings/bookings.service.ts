import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, PipelineStage, Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Booking, Bookings } from '../../libs/dto/booking/booking';
import {
	BookingInquiry,
	CancelBookingByAdminInput,
	ConfirmBookingByAdminInput,
	CreateHotelBookingInput,
	CreateTourBookingInput,
} from '../../libs/dto/booking/booking.input';
import { Hotel } from '../../libs/dto/hotel/hotel';
import { Member } from '../../libs/dto/member/member';
import { Tour } from '../../libs/dto/tour/tour';
import { BookingStatus, BookingType } from '../../libs/enums/booking.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { HotelStatus } from '../../libs/enums/hotel.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { TourStatus } from '../../libs/enums/tour.enum';
import { T } from '../../libs/types/common';

const PLATFORM_ADMIN_NICK = 'velora_admin';

@Injectable()
export class BookingsService {
	constructor(
		@InjectModel('Booking') private readonly bookingModel: Model<Booking>,
		@InjectModel('Tour') private readonly tourModel: Model<Tour>,
		@InjectModel('Hotel') private readonly hotelModel: Model<Hotel>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectConnection() private readonly connection: Connection,
	) {}

	public async createTourBooking(memberId: Types.ObjectId, input: CreateTourBookingInput): Promise<Booking> {
		const tourId = shapeIntoMongoObjectId(input.tourId);
		const targetTour = await this.tourModel
			.findOne({
				_id: tourId,
				tourStatus: TourStatus.ACTIVE,
			})
			.lean()
			.exec();

		if (!targetTour) throw new NotFoundException(Message.NO_DATA_FOUND);

		try {
			return await this.bookingModel.create({
				bookingType: BookingType.TOUR,
				bookingStatus: BookingStatus.PENDING,
				bookingRefId: tourId,
				memberId,
				agentId: targetTour.memberId,
				bookingTitle: targetTour.tourTitle,
				bookingPrice: targetTour.tourPrice,
			});
		} catch {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getMyTourBookings(memberId: Types.ObjectId, input: BookingInquiry): Promise<Bookings> {
		return await this.getMyBookingsByType(memberId, BookingType.TOUR, input);
	}

	public async hasConfirmedTourBooking(memberId: Types.ObjectId, agentId: string): Promise<boolean> {
		if (!Types.ObjectId.isValid(agentId)) {
			throw new BadRequestException(`agentId ${Message.BAD_REQUEST}`);
		}

		const count = await this.bookingModel.countDocuments({
			memberId,
			agentId: shapeIntoMongoObjectId(agentId),
			bookingType: BookingType.TOUR,
			bookingStatus: BookingStatus.CONFIRMED,
		});
		return count > 0;
	}

	public async confirmBookingByAdmin(input: ConfirmBookingByAdminInput): Promise<Booking> {
		const result = await this.bookingModel
			.findOneAndUpdate(
				{ _id: input._id, bookingType: BookingType.TOUR, bookingStatus: BookingStatus.PENDING },
				{ bookingStatus: BookingStatus.CONFIRMED },
				{ new: true },
			)
			.exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		const updatedTour = await this.tourModel
			.findOneAndUpdate(
				{ _id: result.bookingRefId, tourStatus: { $ne: TourStatus.DELETE } },
				{ $inc: { tourSoldCount: 1 } },
				{ new: true },
			)
			.exec();

		if (!updatedTour) {
			await this.bookingModel.findByIdAndUpdate(result._id, { bookingStatus: BookingStatus.PENDING }).exec();
			throw new BadRequestException(Message.UPDATE_FAILED);
		}

		return result;
	}

	public async createHotelBooking(memberId: Types.ObjectId, input: CreateHotelBookingInput): Promise<Booking> {
		const hotelId = shapeIntoMongoObjectId(input.hotelId);
		const quantity = Math.max(1, Number(input.quantity ?? 1));
		const checkInDate = this.parseDateOnly(input.checkInDate);
		const checkOutDate = this.parseDateOnly(input.checkOutDate);
		this.assertHotelDates(checkInDate, checkOutDate);

		const targetHotel = await this.hotelModel
			.findOne({
				_id: hotelId,
				hotelStatus: HotelStatus.ACTIVE,
			})
			.lean()
			.exec();

		if (!targetHotel) throw new NotFoundException(Message.NO_DATA_FOUND);
		if ((targetHotel.availableRooms ?? 0) < quantity) {
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}

		const overlap = await this.bookingModel
			.countDocuments({
				memberId,
				bookingRefId: hotelId,
				bookingType: BookingType.HOTEL,
				bookingStatus: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
				checkInDate: { $lt: checkOutDate },
				checkOutDate: { $gt: checkInDate },
			})
			.exec();
		if (overlap > 0) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const agentId = await this.resolvePlatformAdminId();
		const nights = this.countNights(checkInDate, checkOutDate);
		const bookingPrice = Math.max(0, Number(targetHotel.hotelPrice) * nights * quantity);

		try {
			return await this.bookingModel.create({
				bookingType: BookingType.HOTEL,
				bookingStatus: BookingStatus.PENDING,
				bookingRefId: hotelId,
				memberId,
				agentId,
				bookingTitle: targetHotel.hotelName,
				bookingPrice,
				checkInDate,
				checkOutDate,
				quantity,
			});
		} catch {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getMyHotelBookings(memberId: Types.ObjectId, input: BookingInquiry): Promise<Bookings> {
		return await this.getMyBookingsByType(memberId, BookingType.HOTEL, input);
	}

	public async confirmHotelBookingByAdmin(input: ConfirmBookingByAdminInput): Promise<Booking> {
		const bookingId = shapeIntoMongoObjectId(input._id);

		try {
			return await this.confirmHotelBookingWithSession(bookingId);
		} catch (err) {
			if (!this.isTransactionUnsupported(err)) throw err;
			return await this.confirmHotelBookingCompensating(bookingId);
		}
	}

	private async confirmHotelBookingWithSession(bookingId: Types.ObjectId): Promise<Booking> {
		const session = await this.connection.startSession();

		try {
			let confirmed: Booking | null = null;

			await session.withTransaction(async () => {
				const pending = await this.bookingModel
					.findOne({
						_id: bookingId,
						bookingType: BookingType.HOTEL,
						bookingStatus: BookingStatus.PENDING,
					})
					.session(session)
					.exec();

				if (!pending) throw new BadRequestException(Message.UPDATE_FAILED);

				const quantity = Math.max(1, Number(pending.quantity ?? 1));
				const updatedHotel = await this.hotelModel
					.findOneAndUpdate(
						{
							_id: pending.bookingRefId,
							hotelStatus: { $ne: HotelStatus.DELETE },
							availableRooms: { $gte: quantity },
						},
						{ $inc: { availableRooms: -quantity } },
						{ new: true, session },
					)
					.exec();

				if (!updatedHotel) throw new BadRequestException(Message.UPDATE_FAILED);

				confirmed = await this.bookingModel
					.findOneAndUpdate(
						{ _id: pending._id, bookingStatus: BookingStatus.PENDING },
						{ bookingStatus: BookingStatus.CONFIRMED },
						{ new: true, session },
					)
					.exec();

				if (!confirmed) throw new BadRequestException(Message.UPDATE_FAILED);
			});

			if (!confirmed) throw new BadRequestException(Message.UPDATE_FAILED);
			return confirmed;
		} finally {
			await session.endSession();
		}
	}

	private async confirmHotelBookingCompensating(bookingId: Types.ObjectId): Promise<Booking> {
		const pending = await this.bookingModel
			.findOne({
				_id: bookingId,
				bookingType: BookingType.HOTEL,
				bookingStatus: BookingStatus.PENDING,
			})
			.exec();
		if (!pending) throw new BadRequestException(Message.UPDATE_FAILED);

		const quantity = Math.max(1, Number(pending.quantity ?? 1));
		const updatedHotel = await this.hotelModel
			.findOneAndUpdate(
				{
					_id: pending.bookingRefId,
					hotelStatus: { $ne: HotelStatus.DELETE },
					availableRooms: { $gte: quantity },
				},
				{ $inc: { availableRooms: -quantity } },
				{ new: true },
			)
			.exec();
		if (!updatedHotel) throw new BadRequestException(Message.UPDATE_FAILED);

		const confirmed = await this.bookingModel
			.findOneAndUpdate(
				{ _id: pending._id, bookingStatus: BookingStatus.PENDING },
				{ bookingStatus: BookingStatus.CONFIRMED },
				{ new: true },
			)
			.exec();

		if (!confirmed) {
			await this.hotelModel
				.findByIdAndUpdate(pending.bookingRefId, { $inc: { availableRooms: quantity } })
				.exec();
			throw new BadRequestException(Message.UPDATE_FAILED);
		}

		return confirmed;
	}

	public async cancelHotelBookingByAdmin(input: CancelBookingByAdminInput): Promise<Booking> {
		const bookingId = shapeIntoMongoObjectId(input._id);
		const existing = await this.bookingModel
			.findOne({
				_id: bookingId,
				bookingType: BookingType.HOTEL,
				bookingStatus: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
			})
			.exec();

		if (!existing) throw new BadRequestException(Message.UPDATE_FAILED);

		if (existing.bookingStatus === BookingStatus.PENDING) {
			const cancelled = await this.bookingModel
				.findOneAndUpdate(
					{ _id: bookingId, bookingStatus: BookingStatus.PENDING },
					{ bookingStatus: BookingStatus.CANCELLED },
					{ new: true },
				)
				.exec();
			if (!cancelled) throw new BadRequestException(Message.UPDATE_FAILED);
			return cancelled;
		}

		try {
			return await this.cancelConfirmedHotelWithSession(existing);
		} catch (err) {
			if (!this.isTransactionUnsupported(err)) throw err;
			return await this.cancelConfirmedHotelCompensating(existing);
		}
	}

	private async cancelConfirmedHotelWithSession(existing: Booking): Promise<Booking> {
		const quantity = Math.max(1, Number(existing.quantity ?? 1));
		const session = await this.connection.startSession();

		try {
			let cancelled: Booking | null = null;

			await session.withTransaction(async () => {
				const updatedBooking = await this.bookingModel
					.findOneAndUpdate(
						{ _id: existing._id, bookingStatus: BookingStatus.CONFIRMED },
						{ bookingStatus: BookingStatus.CANCELLED },
						{ new: true, session },
					)
					.exec();
				if (!updatedBooking) throw new BadRequestException(Message.UPDATE_FAILED);

				const restoredHotel = await this.hotelModel
					.findOneAndUpdate(
						{ _id: existing.bookingRefId, hotelStatus: { $ne: HotelStatus.DELETE } },
						{ $inc: { availableRooms: quantity } },
						{ new: true, session },
					)
					.exec();
				if (!restoredHotel) throw new BadRequestException(Message.UPDATE_FAILED);

				cancelled = updatedBooking;
			});

			if (!cancelled) throw new BadRequestException(Message.UPDATE_FAILED);
			return cancelled;
		} finally {
			await session.endSession();
		}
	}

	private async cancelConfirmedHotelCompensating(existing: Booking): Promise<Booking> {
		const quantity = Math.max(1, Number(existing.quantity ?? 1));
		const updatedBooking = await this.bookingModel
			.findOneAndUpdate(
				{ _id: existing._id, bookingStatus: BookingStatus.CONFIRMED },
				{ bookingStatus: BookingStatus.CANCELLED },
				{ new: true },
			)
			.exec();
		if (!updatedBooking) throw new BadRequestException(Message.UPDATE_FAILED);

		const restoredHotel = await this.hotelModel
			.findOneAndUpdate(
				{ _id: existing.bookingRefId, hotelStatus: { $ne: HotelStatus.DELETE } },
				{ $inc: { availableRooms: quantity } },
				{ new: true },
			)
			.exec();

		if (!restoredHotel) {
			await this.bookingModel
				.findByIdAndUpdate(existing._id, { bookingStatus: BookingStatus.CONFIRMED })
				.exec();
			throw new BadRequestException(Message.UPDATE_FAILED);
		}

		return updatedBooking;
	}


	private isTransactionUnsupported(err: unknown): boolean {
		const message = String((err as any)?.message ?? err ?? '');
		return message.includes('Transaction numbers') || message.includes('replica set') || message.includes('mongos');
	}

	private async getMyBookingsByType(
		memberId: Types.ObjectId,
		bookingType: BookingType,
		input: BookingInquiry,
	): Promise<Bookings> {
		const match: T = {
			memberId,
			bookingType,
		};
		if (input.bookingStatus) match.bookingStatus = input.bookingStatus;

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const pipeline: PipelineStage[] = [
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
					metaCounter: [{ $count: 'total' }],
				},
			},
		];

		const result = await this.bookingModel.aggregate(pipeline).exec();
		return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
	}

	private async resolvePlatformAdminId(): Promise<Types.ObjectId> {
		const preferred = await this.memberModel
			.findOne({ memberType: MemberType.ADMIN, memberNick: PLATFORM_ADMIN_NICK })
			.select('_id')
			.lean()
			.exec();
		if (preferred?._id) return preferred._id as Types.ObjectId;

		const anyAdmin = await this.memberModel.findOne({ memberType: MemberType.ADMIN }).select('_id').lean().exec();
		if (!anyAdmin?._id) throw new BadRequestException(Message.BAD_REQUEST);
		return anyAdmin._id as Types.ObjectId;
	}

	private parseDateOnly(value: string): Date {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
		if (!match) throw new BadRequestException(Message.BAD_REQUEST);
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const date = new Date(Date.UTC(year, month - 1, day));
		if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
			throw new BadRequestException(Message.BAD_REQUEST);
		}
		return date;
	}

	private assertHotelDates(checkInDate: Date, checkOutDate: Date): void {
		const today = new Date();
		const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
		if (checkInDate.getTime() < todayUtc.getTime()) {
			throw new BadRequestException(Message.BAD_REQUEST);
		}
		if (checkOutDate.getTime() <= checkInDate.getTime()) {
			throw new BadRequestException(Message.BAD_REQUEST);
		}
	}

	private countNights(checkInDate: Date, checkOutDate: Date): number {
		const ms = checkOutDate.getTime() - checkInDate.getTime();
		return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
	}
}
