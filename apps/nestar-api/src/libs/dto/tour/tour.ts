import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { TourStatus } from '../../enums/tour.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class Tour {
    @Field(() => String)
    _id: ObjectId;

    @Field(() => String)
    tourTitle: string;

    @Field(() => String)
    tourLocation: string;

    @Field(() => Int)
    tourDays: number;

    @Field(() => Int)
    tourNights: number;

    @Field(() => Number)
    tourPrice: number;

    @Field(() => [String])
    tourImages: string[];

    @Field(() => String, { nullable: true })
    tourDesc?: string;

    @Field(() => TourStatus)
    tourStatus: TourStatus;

    @Field(() => Int)
    tourLikes: number;

    @Field(() => Int)
    tourViews: number;

    @Field(() => Int)
    tourComments: number;

    @Field(() => Int)
    tourRank: number;

    @Field(() => String)
    memberId: ObjectId;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;

    @Field(() => [MeLiked], { nullable: true })
    meLiked?: MeLiked[];

    @Field(() => Member, { nullable: true })
    memberData?: Member;
}

@ObjectType()
export class Tours {
    @Field(() => [Tour])
    list: Tour[];

    @Field(() => [TotalCounter], { nullable: true })
    metaCounter: TotalCounter[];
}
