import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { Direction } from '../../enums/common.enum';
import { HotelStatus } from '../../enums/hotel.enum';

const availableHotelSorts = ['createdAt', 'hotelPrice', 'hotelLikes', 'hotelViews', 'hotelRank', 'hotelStars'];

@InputType()
export class HotelInput {
    @IsNotEmpty()
    @Length(2, 120)
    @Field(() => String)
    hotelName: string;

    @IsNotEmpty()
    @Length(2, 100)
    @Field(() => String)
    hotelLocation: string;

    @IsNotEmpty()
    @Length(3, 200)
    @Field(() => String)
    hotelAddress: string;

    @IsNotEmpty()
    @Min(0)
    @Field(() => Number)
    hotelPrice: number;

    @IsNotEmpty()
    @Min(1)
    @Max(5)
    @Field(() => Int)
    hotelStars: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    availableRooms?: number;

    @IsNotEmpty()
    @Field(() => [String])
    hotelImages: string[];

    @IsOptional()
    @Length(5, 700)
    @Field(() => String, { nullable: true })
    hotelDesc?: string;

    @IsOptional()
    @Field(() => HotelStatus, { nullable: true })
    hotelStatus?: HotelStatus;
}

@InputType()
class HotelSearch {
    @IsOptional()
    @Field(() => String, { nullable: true })
    hotelLocation?: string;

    @IsOptional()
    @Field(() => HotelStatus, { nullable: true })
    hotelStatus?: HotelStatus;

    @IsOptional()
    @Field(() => String, { nullable: true })
    text?: string;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    minPrice?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    maxPrice?: number;

    @IsOptional()
    @Min(1)
    @Max(5)
    @Field(() => Int, { nullable: true })
    minStars?: number;
}

@InputType()
export class HotelsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableHotelSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => HotelSearch)
    search: HotelSearch;
}

@InputType()
class AllHotelsSearch {
    @IsOptional()
    @Field(() => HotelStatus, { nullable: true })
    hotelStatus?: HotelStatus;

    @IsOptional()
    @Field(() => String, { nullable: true })
    hotelLocation?: string;
}

@InputType()
export class AllHotelsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableHotelSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => AllHotelsSearch)
    search: AllHotelsSearch;
}
