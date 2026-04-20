import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { Types } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { TourStatus } from '../../enums/tour.enum';

const availableTourSorts = ['createdAt', 'tourPrice', 'tourLikes', 'tourViews', 'tourRank'];

@InputType()
export class TourInput {
    @IsNotEmpty()
    @Length(3, 120)
    @Field(() => String)
    tourTitle: string;

    @IsNotEmpty()
    @Length(2, 100)
    @Field(() => String)
    tourLocation: string;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    tourDays: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    tourNights?: number;

    @IsNotEmpty()
    @Min(0)
    @Field(() => Number)
    tourPrice: number;

    @IsNotEmpty()
    @Field(() => [String])
    tourImages: string[];

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, { nullable: true })
    tourDesc?: string;

    @IsOptional()
    @Field(() => TourStatus, { nullable: true })
    tourStatus?: TourStatus;

    memberId?: Types.ObjectId;
}

@InputType()
class TourSearch {
    @IsOptional()
    @Field(() => String, { nullable: true })
    memberId?: Types.ObjectId;

    @IsOptional()
    @Field(() => String, { nullable: true })
    tourLocation?: string;

    @IsOptional()
    @Field(() => TourStatus, { nullable: true })
    tourStatus?: TourStatus;

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
}

@InputType()
export class ToursInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableTourSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => TourSearch)
    search: TourSearch;
}
