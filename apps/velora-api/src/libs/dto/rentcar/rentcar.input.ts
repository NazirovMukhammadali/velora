import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { Direction } from '../../enums/common.enum';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../../enums/rentcar.enum';

const availableRentcarSorts = ['createdAt', 'dailyPrice', 'seats', 'rentcarLikes', 'rentcarViews', 'rentcarRank'];

@InputType()
export class RentcarInput {
    @IsNotEmpty()
    @Length(3, 120)
    @Field(() => String)
    carTitle: string;

    @IsNotEmpty()
    @Length(2, 100)
    @Field(() => String)
    carLocation: string;

    @IsNotEmpty()
    @Field(() => RentcarCategory)
    carCategory: RentcarCategory;

    @IsOptional()
    @Field(() => TransmissionType, { nullable: true })
    transmission?: TransmissionType;

    @IsNotEmpty()
    @Min(1)
    @Max(16)
    @Field(() => Int)
    seats: number;

    @IsNotEmpty()
    @Min(0)
    @Field(() => Number)
    dailyPrice: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    availableCars?: number;

    @IsNotEmpty()
    @Field(() => [String])
    carImages: string[];

    @IsOptional()
    @Length(5, 700)
    @Field(() => String, { nullable: true })
    carDesc?: string;

    @IsOptional()
    @Field(() => RentcarStatus, { nullable: true })
    rentcarStatus?: RentcarStatus;
}

@InputType()
class RentcarSearch {
    @IsOptional()
    @Field(() => String, { nullable: true })
    carLocation?: string;

    @IsOptional()
    @Field(() => RentcarCategory, { nullable: true })
    carCategory?: RentcarCategory;

    @IsOptional()
    @Field(() => TransmissionType, { nullable: true })
    transmission?: TransmissionType;

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
    @Field(() => Int, { nullable: true })
    minSeats?: number;
}

@InputType()
export class RentcarsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableRentcarSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => RentcarSearch)
    search: RentcarSearch;
}

@InputType()
class AllRentcarsSearch {
    @IsOptional()
    @Field(() => RentcarStatus, { nullable: true })
    rentcarStatus?: RentcarStatus;

    @IsOptional()
    @Field(() => String, { nullable: true })
    carLocation?: string;

    @IsOptional()
    @Field(() => RentcarCategory, { nullable: true })
    carCategory?: RentcarCategory;
}

@InputType()
export class AllRentcarsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableRentcarSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => AllRentcarsSearch)
    search: AllRentcarsSearch;
}
