import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { Types } from 'mongoose';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../../enums/rentcar.enum';

@InputType()
export class RentcarUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: Types.ObjectId;

	@IsOptional()
	@Length(3, 120)
	@Field(() => String, { nullable: true })
	carTitle?: string;

	@IsOptional()
	@Length(2, 100)
	@Field(() => String, { nullable: true })
	carLocation?: string;

	@IsOptional()
	@Field(() => RentcarCategory, { nullable: true })
	carCategory?: RentcarCategory;

	@IsOptional()
	@Field(() => TransmissionType, { nullable: true })
	transmission?: TransmissionType;

	@IsOptional()
	@Min(1)
	@Max(16)
	@Field(() => Int, { nullable: true })
	seats?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Number, { nullable: true })
	dailyPrice?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Int, { nullable: true })
	availableCars?: number;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	carImages?: string[];

	@IsOptional()
	@Length(5, 700)
	@Field(() => String, { nullable: true })
	carDesc?: string;

	@IsOptional()
	@Field(() => RentcarStatus, { nullable: true })
	rentcarStatus?: RentcarStatus;
}
