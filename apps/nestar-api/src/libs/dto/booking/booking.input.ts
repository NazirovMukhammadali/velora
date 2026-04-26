import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Types } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { BookingStatus } from '../../enums/booking.enum';

const availableBookingSorts = ['createdAt', 'bookingStatus', 'bookingPrice'];

@InputType()
export class CreateTourBookingInput {
    @IsNotEmpty()
    @Field(() => String)
    tourId: Types.ObjectId;
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
export class BookingUpdateStatusByAdminInput {
    @IsNotEmpty()
    @Field(() => String)
    _id: Types.ObjectId;

    @IsNotEmpty()
    @Field(() => BookingStatus)
    bookingStatus: BookingStatus;
}
