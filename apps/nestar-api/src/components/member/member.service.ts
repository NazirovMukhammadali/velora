import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Schema, Types } from 'mongoose';
import { Member, Members } from '../../libs/dto/member/member';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { AuthService } from '../auth/auth.service';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { ViewService } from '../view/view.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
import { lookupAuthMemberLiked } from '../../libs/config';

@Injectable()
export class MemberService {
    constructor(@InjectModel('Member') private readonly memberModel: Model<Member>,
        @InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
        private authService: AuthService,
        private viewService: ViewService,
        private likeService: LikeService,
    ) { }

    public async signup(input: MemberInput): Promise<Member> {
        input.memberPassword = await this.authService.hashPassword(input.memberPassword);
        try {
            const result = await this.memberModel.create(input);
            result.accessToken = await this.authService.createToken(result);
            result.memberPassword = undefined as any;
            return result;
        } catch (err) {
            throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
        }
    }

    public async login(input: LoginInput): Promise<Member> {
        const { memberNick, memberPassword } = input; // distract
        const response: Member | null = await this.memberModel
            .findOne({
                memberNick: memberNick
            })
            .select('+memberPassword')
            .exec() as Member;

        if (!response || response.memberStatus === MemberStatus.DELETE) {
            throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
        } else if (response.memberStatus === MemberStatus.BLOCK) {
            throw new InternalServerErrorException(Message.BLOCKED_USER);
        }

        const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
        if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);
        response.accessToken = await this.authService.createToken(response);
        response.memberPassword = undefined as any;

        return response;

    }

    public async updateMember(
        memberId: Types.ObjectId,
        input: MemberUpdate
    ): Promise<Member> {
        const result: Member | null = await this.memberModel
            .findOneAndUpdate(
                {
                    _id: memberId,
                    memberStatus: MemberStatus.ACTIVE,
                },
                input,
                { new: true },
            )
            .exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

        result.accessToken = await this.authService.createToken(result);
        return result;
    }

    public async getMember(memberId: Types.ObjectId | null, targetId: ObjectId): Promise<Member> {
        const search: T = { // erkin object
            _id: targetId,
            memberStatus: {
                $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
            },
        };
        const targetMember = await this.memberModel.findOne(search).lean().exec(); // query methods(lean/exec)
        if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        if (memberId) {
            const viewInput = {  // state propety // ikki xil propety bor / state, method
                memberId: memberId,
                viewRefId: targetId as unknown as Types.ObjectId,
                viewGroup: ViewGroup.MEMBER
            };
            const newView = await this.viewService.recordView(viewInput);
            if (newView) {
                await this.memberModel.findOneAndUpdate(
                    search,
                    { $inc: { memberViews: 1 } },
                    { new: true })
                    .exec();
                targetMember.memberViews++;
            }
            const likeInput = {
                memberId: memberId as Types.ObjectId,
                likeRefId: targetId as unknown as Types.ObjectId,
                likeGroup: LikeGroup.MEMBER
            };

            targetMember.meLiked = await this.likeService.checkLikeExistence(likeInput);
        }
        return targetMember;
    }

    public async getAgents(memberId: Types.ObjectId, input: AgentsInquiry): Promise<Members> {
        const { text } = input.search;
        const match: T = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

        if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

        const aggregateResult = await this.memberModel.aggregate([
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                    list: [
                        { $skip: (input.page - 1) * input.limit }, //agentsId
                        { $limit: input.limit },
                        // meLiked
                        lookupAuthMemberLiked(memberId),
                    ],
                    metaCounter: [{ $count: 'total' }],
                },
            },
        ]).exec();

        const result: Members = {
            list: aggregateResult[0]?.list ?? [],
            metaCounter: aggregateResult[0]?.metaCounter ?? [],
            length: undefined
        };

        if (!result.list.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        return result;
    }

    public async likeTargetMember(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<Member> {
        const target: Member | null = await this.memberModel
            .findOne({
                _id: likeRefId,
                memberStatus: MemberStatus.ACTIVE,
            })
            .exec();

        if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            memberId: memberId,
            likeRefId: likeRefId,
            likeGroup: LikeGroup.MEMBER,
        };

        const modifier: number = await this.likeService.toggleLike(input);
        const result = await this.memberStatsEditor({
            _id: likeRefId,
            targetKey: 'memberLikes',
            modifier: modifier,
        });

        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

        return result;
    }


    /* ADMIN */

    // Authoriztion: ADMIN
    public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
        const { text, memberStatus, memberType } = input.search;
        const match: T = {};
        const sort: T = {
            [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
        };

        if (memberStatus) match.memberStatus = memberStatus;
        if (memberType) match.memberType = memberType;
        if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

        const result = await this.memberModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();
        if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        return result[0];
    }

    public async updateMemberByAdmin(
        input: MemberUpdate
    ): Promise<Member> {
        const result = await this.memberModel
            .findOneAndUpdate({ _id: input._id }, input, { new: true })
            .exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        return result;
    }

    private async checkSubscription(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<MeFollowed[]> {
        const result = await this.followModel
            .findOne({
                followerId: followerId,
                followingId: followingId,
            })
            .exec();

        if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
        return result
            ? [
                {
                    followerId: followerId,
                    followingId: followingId,
                    myFollowing: true,
                },
            ]
            : [];
    }

    public async memberStatsEditor(input: StatisticModifier): Promise<Member | null> {
        const { _id, targetKey, modifier } = input;

        return await this.memberModel
            .findByIdAndUpdate(
                _id,
                { $inc: { [targetKey]: modifier } }, // dynamic key +1
                { new: true })
            .exec();
    }
}
