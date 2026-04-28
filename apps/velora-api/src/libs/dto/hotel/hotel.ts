import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { HotelStatus } from '../../enums/hotel.enum';
import { MeLiked } from '../like/like';
import { TotalCounter } from '../member/member';

@ObjectType()
export class Hotel {
    @Field(() => String)
    _id: ObjectId;

    @Field(() => String)
    hotelName: string;

    @Field(() => String)
    hotelLocation: string;

    @Field(() => String)
    hotelAddress: string;

    @Field(() => Number)
    hotelPrice: number;

    @Field(() => Int)
    hotelStars: number;

    @Field(() => Int)
    availableRooms: number;

    @Field(() => [String])
    hotelImages: string[];

    @Field(() => String, { nullable: true })
    hotelDesc?: string;

    @Field(() => HotelStatus)
    hotelStatus: HotelStatus;

    @Field(() => Int)
    hotelLikes: number;

    @Field(() => Int)
    hotelViews: number;

    @Field(() => Int)
    hotelComments: number;

    @Field(() => Int)
    hotelRank: number;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;

    @Field(() => [MeLiked], { nullable: true })
    meLiked?: MeLiked[];
}

@ObjectType()
export class Hotels {
    @Field(() => [Hotel])
    list: Hotel[];

    @Field(() => [TotalCounter], { nullable: true })
    metaCounter: TotalCounter[];
}
