import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { BookingStatus, BookingType } from '../../enums/booking.enum';
import { TotalCounter } from '../member/member';

@ObjectType()
export class Booking {
	@Field(() => String)
	_id: Types.ObjectId;

	@Field(() => BookingType)
	bookingType: BookingType;

	@Field(() => BookingStatus)
	bookingStatus: BookingStatus;

	@Field(() => String)
	bookingRefId: Types.ObjectId;

	@Field(() => String)
	memberId: Types.ObjectId;

	@Field(() => String)
	agentId: Types.ObjectId;

	@Field(() => String)
	bookingTitle: string;

	@Field(() => Int)
	bookingPrice: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}

@ObjectType()
export class Bookings {
	@Field(() => [Booking])
	list: Booking[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
