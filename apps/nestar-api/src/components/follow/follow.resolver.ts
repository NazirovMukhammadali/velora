import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { FollowService } from './follow.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Schema, Types } from 'mongoose';
import { Follower, Followers, Followings } from '../../libs/dto/follow/follow';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { FollowInquiry } from '../../libs/dto/follow/follow.input';

@Resolver()
export class FollowResolver {
    constructor(private readonly followService: FollowService) { }

    @UseGuards(AuthGuard)
    @Mutation(() => Follower)
    public async subscribe(@Args('input') input: string, @AuthMember('_id') memberId: Types.ObjectId): Promise<Follower> {
        const followingId = shapeIntoMongoObjectId(input);

        return await this.followService.subscribe(memberId as unknown as Schema.Types.ObjectId,
            followingId as unknown as Schema.Types.ObjectId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Follower)
    public async unsubscribe(@Args('input') input: string, @AuthMember('_id') memberId: Types.ObjectId): Promise<Follower> {
        const followingId = shapeIntoMongoObjectId(input);
        return await this.followService.unsubscribe(memberId as unknown as Schema.Types.ObjectId,
            followingId as unknown as Schema.Types.ObjectId);
    }

    @UseGuards(WithoutGuard)
    @Query(() => Followings)
    public async getMemberFollowings(
        @Args('input') input: FollowInquiry,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Followings> {
        input.search.followerId = shapeIntoMongoObjectId(input.search.followerId);

        return await this.followService.getMemberFollowings(memberId as unknown as Types.ObjectId,
            input);
    }

    @UseGuards(WithoutGuard)
    @Query(() => Followers)
    public async getMemberFollowers(
        @Args('input') input: FollowInquiry,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Followers> {
        let { followingId } = input.search;
        input.search.followingId = shapeIntoMongoObjectId(followingId);
        return await this.followService.getMemberFollowers(memberId as unknown as Types.ObjectId,
            input);
    }
}
