import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { Types } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { BookingStatus, BookingType } from '../../enums/booking.enum';

const availableBookingSorts = ['createdAt', 'bookingStatus', 'bookingPrice'];

@InputType()
export class CreateTourBookingInput {
	@IsNotEmpty()
	@Field(() => String)
	tourId: Types.ObjectId;
}

@InputType()
export class CreateHotelBookingInput {
	@IsNotEmpty()
	@Field(() => String)
	hotelId: Types.ObjectId;

	@IsNotEmpty()
	@IsDateString()
	@Field(() => String)
	checkInDate: string;

	@IsNotEmpty()
	@IsDateString()
	@Field(() => String)
	checkOutDate: string;

	@IsOptional()
	@Min(1)
	@Field(() => Int, { nullable: true })
	quantity?: number;
}

@InputType()
export class BookingInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableBookingSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsOptional()
	@Field(() => BookingStatus, { nullable: true })
	bookingStatus?: BookingStatus;
}

@InputType()
export class ConfirmBookingByAdminInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: Types.ObjectId;
}

@InputType()
export class CancelBookingByAdminInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: Types.ObjectId;
}

@InputType()
class AllBookingsSearch {
	@IsOptional()
	@Field(() => BookingType, { nullable: true })
	bookingType?: BookingType;

	@IsOptional()
	@Field(() => BookingStatus, { nullable: true })
	bookingStatus?: BookingStatus;

	@IsOptional()
	@Length(1, 100)
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class AllBookingsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableBookingSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => AllBookingsSearch)
	search: AllBookingsSearch;
}
