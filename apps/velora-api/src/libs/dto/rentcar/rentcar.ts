import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { MeLiked } from '../like/like';
import { TotalCounter } from '../member/member';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../../enums/rentcar.enum';

@ObjectType()
export class Rentcar {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	carTitle: string;

	@Field(() => String)
	carLocation: string;

	@Field(() => RentcarCategory)
	carCategory: RentcarCategory;

	@Field(() => TransmissionType)
	transmission: TransmissionType;

	@Field(() => Int)
	seats: number;

	@Field(() => Number)
	dailyPrice: number;

	@Field(() => Int)
	availableCars: number;

	@Field(() => [String])
	carImages: string[];

	@Field(() => String, { nullable: true })
	carDesc?: string;

	@Field(() => RentcarStatus)
	rentcarStatus: RentcarStatus;

	@Field(() => Int)
	rentcarLikes: number;

	@Field(() => Int)
	rentcarViews: number;

	@Field(() => Int)
	rentcarComments: number;

	@Field(() => Int)
	rentcarRank: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

@ObjectType()
export class Rentcars {
	@Field(() => [Rentcar])
	list: Rentcar[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
