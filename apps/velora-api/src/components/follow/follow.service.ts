import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Follower, Followers, Following, Followings } from '../../libs/dto/follow/follow';
import { MemberService } from '../member/member.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import { Member } from '../../libs/dto/member/member';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { FollowInquiry } from '../../libs/dto/follow/follow.input';
import { T } from '../../libs/types/common';
import {
	lookupAuthMemberFollowed,
	lookupAuthMemberLiked,
	lookupFollowerData,
	lookupFollowingData,
} from '../../libs/config';

/** Instagram-style: any regular member (traveller or agent) can follow any other one; admins are not followable. */
const FOLLOWABLE_TYPES: string[] = [MemberType.USER, MemberType.AGENT];
/** Follow lists only show members that still exist and are not soft-deleted (same rule as getMember). */
const LISTED_MEMBER_STATUSES = [MemberStatus.ACTIVE, MemberStatus.BLOCK];

@Injectable()
export class FollowService {
	constructor(
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		private readonly memberService: MemberService,
	) {}

	public async subscribe(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<Follower> {
		if (followerId.toString() === followingId.toString()) {
			throw new InternalServerErrorException(Message.SELF_SUBSCRIPTION_DENIED);
		}

		const followerMember: Member = await this.memberService.getMember(null, followerId);
		const targetMember: Member = await this.memberService.getMember(null, followingId);

		if (!followerMember || !targetMember) {
			throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		}
		if (
			!FOLLOWABLE_TYPES.includes(followerMember.memberType) ||
			!FOLLOWABLE_TYPES.includes(targetMember.memberType) ||
			followerMember.memberStatus !== MemberStatus.ACTIVE ||
			targetMember.memberStatus !== MemberStatus.ACTIVE
		) {
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}

		const duplicate = await this.followModel.findOne({ followingId: followingId, followerId: followerId }).exec();
		if (duplicate) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const result = await this.registerSubscription(followerId, followingId);

		await this.memberService.memberStatsEditor({
			_id: followerId,
			targetKey: 'memberFollowings',
			modifier: 1,
		});

		await this.memberService.memberStatsEditor({
			_id: followingId,
			targetKey: 'memberFollowers',
			modifier: 1,
		});

		return result;
	}

	private async registerSubscription(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<Follower> {
		try {
			return await this.followModel.create({
				followingId: followingId,
				followerId: followerId,
			});
		} catch (error) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async unsubscribe(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<Follower> {
		const targetMember = await this.memberService.getMember(null, followingId);

		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const result = await this.followModel
			.findOneAndDelete({
				followingId: followingId,
				followerId: followerId,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		await this.memberService.memberStatsEditor({
			_id: followerId,
			targetKey: 'memberFollowings',
			modifier: -1,
		});

		await this.memberService.memberStatsEditor({
			_id: followingId,
			targetKey: 'memberFollowers',
			modifier: -1,
		});
		return result;
	}

	public async getMemberFollowings(memberId: Types.ObjectId, input: FollowInquiry): Promise<Followings> {
		const { page, limit, search } = input;
		if (!search?.followerId) throw new InternalServerErrorException(Message.BAD_REQUEST);
		const match: T = {
			followerId: search?.followerId,
		};

		const result = await this.followModel
			.aggregate([
				{ $match: match },
				// Drop follows of removed/deleted members before paging so the list and total agree.
				lookupFollowingData,
				{ $unwind: '$followingData' },
				{ $match: { 'followingData.memberStatus': { $in: LISTED_MEMBER_STATUSES } } },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId, '$followingId'),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followingId' }),
						],
						metaCounter: [
							{
								$count: 'total',
							},
						],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getMemberFollowers(memberId: Types.ObjectId, input: FollowInquiry): Promise<Followers> {
		const { page, limit, search } = input;
		if (!search?.followingId) throw new InternalServerErrorException(Message.BAD_REQUEST);

		const match: T = {
			followingId: search?.followingId,
		};

		const result = await this.followModel
			.aggregate([
				{ $match: match },
				// Drop follows of removed/deleted members before paging so the list and total agree.
				lookupFollowerData,
				{ $unwind: '$followerData' },
				{ $match: { 'followerData.memberStatus': { $in: LISTED_MEMBER_STATUSES } } },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId, '$followerId'),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followerId' }),
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}
}
