import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Booking, Bookings } from '../../libs/dto/booking/booking';
import { BookingInquiry, BookingUpdateStatusByAdminInput, CreateTourBookingInput } from '../../libs/dto/booking/booking.input';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { BookingsService } from './bookings.service';

@Resolver()
export class BookingsResolver {
    constructor(private readonly bookingsService: BookingsService) { }

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

    @UseGuards(AuthGuard)
    @Query(() => Boolean)
    public async hasConfirmedOrPaidTourBooking(
        @AuthMember('_id') memberId: Types.ObjectId,
        @Args('agentId') agentId: string,
    ): Promise<boolean> {
        return await this.bookingsService.hasConfirmedOrPaidTourBooking(memberId, agentId);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Booking)
    public async updateBookingStatusByAdmin(
        @Args('input') input: BookingUpdateStatusByAdminInput,
    ): Promise<Booking> {
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.bookingsService.updateBookingStatusByAdmin(input);
    }
}
