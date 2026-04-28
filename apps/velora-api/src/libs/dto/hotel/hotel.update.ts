import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { Types } from 'mongoose';
import { HotelStatus } from '../../enums/hotel.enum';

@InputType()
export class HotelUpdate {
    @IsNotEmpty()
    @Field(() => String)
    _id: Types.ObjectId;

    @IsOptional()
    @Length(2, 120)
    @Field(() => String, { nullable: true })
    hotelName?: string;

    @IsOptional()
    @Length(2, 100)
    @Field(() => String, { nullable: true })
    hotelLocation?: string;

    @IsOptional()
    @Length(3, 200)
    @Field(() => String, { nullable: true })
    hotelAddress?: string;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    hotelPrice?: number;

    @IsOptional()
    @Min(1)
    @Max(5)
    @Field(() => Int, { nullable: true })
    hotelStars?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    availableRooms?: number;

    @IsOptional()
    @Field(() => [String], { nullable: true })
    hotelImages?: string[];

    @IsOptional()
    @Length(5, 700)
    @Field(() => String, { nullable: true })
    hotelDesc?: string;

    @IsOptional()
    @Field(() => HotelStatus, { nullable: true })
    hotelStatus?: HotelStatus;
}
