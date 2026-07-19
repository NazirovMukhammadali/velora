import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Booking, Bookings } from '../../libs/dto/booking/booking';
import {
	BookingInquiry,
	CancelBookingByAdminInput,
	ConfirmBookingByAdminInput,
	CreateHotelBookingInput,
	CreateTourBookingInput,
} from '../../libs/dto/booking/booking.input';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { BookingsService } from './bookings.service';

@Resolver()
export class BookingsResolver {
	constructor(private readonly bookingsService: BookingsService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Booking)
	public async createTourBooking(
		@AuthMember('_id') memberId: Types.ObjectId,
		@Args('input') input: CreateTourBookingInput,
	): Promise<Booking> {
		input.tourId = shapeIntoMongoObjectId(input.tourId);
		return await this.bookingsService.createTourBooking(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Bookings)
	public async getMyTourBookings(
		@AuthMember('_id') memberId: Types.ObjectId,
		@Args('input') input: BookingInquiry,
	): Promise<Bookings> {
		return await this.bookingsService.getMyTourBookings(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Booking)
	public async confirmTourBookingByAdmin(@Args('input') input: ConfirmBookingByAdminInput): Promise<Booking> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.bookingsService.confirmBookingByAdmin(input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Booking)
	public async createHotelBooking(
		@AuthMember('_id') memberId: Types.ObjectId,
		@Args('input') input: CreateHotelBookingInput,
	): Promise<Booking> {
		input.hotelId = shapeIntoMongoObjectId(input.hotelId);
		return await this.bookingsService.createHotelBooking(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Bookings)
	public async getMyHotelBookings(
		@AuthMember('_id') memberId: Types.ObjectId,
		@Args('input') input: BookingInquiry,
	): Promise<Bookings> {
		return await this.bookingsService.getMyHotelBookings(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Booking)
	public async confirmHotelBookingByAdmin(@Args('input') input: ConfirmBookingByAdminInput): Promise<Booking> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.bookingsService.confirmHotelBookingByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Booking)
	public async cancelHotelBookingByAdmin(@Args('input') input: CancelBookingByAdminInput): Promise<Booking> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.bookingsService.cancelHotelBookingByAdmin(input);
	}
}
