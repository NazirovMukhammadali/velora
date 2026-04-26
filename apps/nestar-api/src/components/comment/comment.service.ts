import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AgentReviewStats, Comment, Comments } from "../../libs/dto/comment/comment";
import { MemberService } from "../member/member.service";
import { BookingsService } from "../bookings/bookings.service";
import { CommentInput, CommentsInquiry } from "../../libs/dto/comment/comment.input";
import { Direction, Message } from "../../libs/enums/common.enum";
import { CommentGroup, CommentStatus } from "../../libs/enums/comment.enum";
import { CommentUpdate } from "../../libs/dto/comment/comment.update";
import { MemberStatus, MemberType } from "../../libs/enums/member.enum";
import { T } from "../../libs/types/common";
import { lookupMember, shapeIntoMongoObjectId } from "../../libs/config";

@Injectable()
export class CommentService {
    constructor(
        @InjectModel("Comment") private readonly commentModel: Model<Comment>,
        private readonly memberService: MemberService,
        private readonly bookingsService: BookingsService,
    ) { }

    public async createComment(
        memberId: Types.ObjectId,
        input: CommentInput
    ): Promise<Comment> {
        if (input.commentGroup !== CommentGroup.MEMBER) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        const writer = await this.memberService.getMember(null, shapeIntoMongoObjectId(memberId));
        if (writer.memberType !== MemberType.USER || writer.memberStatus !== MemberStatus.ACTIVE) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        const agent = await this.memberService.getMember(null, shapeIntoMongoObjectId(input.commentRefId));
        if (agent.memberType !== MemberType.AGENT || agent.memberStatus !== MemberStatus.ACTIVE) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        const hasEligiblePurchase = await this.bookingsService.hasConfirmedOrPaidTourBooking(
            memberId,
            String(input.commentRefId),
        );
        if (!hasEligiblePurchase) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        input.memberId = memberId; // murojatchini inputni ichiga joylndi

        let result: Comment | null = null;
        try {
            result = await this.commentModel.create(input);
        } catch (err) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }

        await this.memberService.memberStatsEditor({
            _id: input.commentRefId,
            targetKey: "memberComments",
            modifier: 1,
        });

        if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
        return result;
    }

    public async updateComment(
        memberId: Types.ObjectId,
        input: CommentUpdate
    ): Promise<Comment> {
        const { _id } = input;
        const result = await this.commentModel
            .findOneAndUpdate(
                {
                    _id: _id, // comment idsi
                    memberId: memberId, // murojatchi idsi => (commenti egasi)
                    commentStatus: CommentStatus.ACTIVE, // statusi ACTIVE bolshi kk
                },
                input,
                {
                    new: true,
                }
            )
            .exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        return result;
    }

    public async getComments(
        memberId: Types.ObjectId | null,
        input: CommentsInquiry
    ): Promise<Comments> {
        const { commentRefId } = input.search; // aynan qaysi commentRefId ga oid commentlarni korsh un
        const match: T = {
            commentRefId: commentRefId,
            commentStatus: CommentStatus.ACTIVE,
        }; // commentRefId => aynan qaysi commentRefId ga oid malumotni kormqochi bolganda
        const sort: T = {
            [input?.sort ?? "createdAt"]: input?.direction ?? Direction.DESC,
        };

        const result: Comments[] = await this.commentModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            // meLiked
                            lookupMember, // commentni hosl qlgan member malumotlari
                            { $unwind: "$memberData" },
                        ],
                        metaCounter: [{ $count: "total" }],
                    },
                },
            ])
            .exec();
        return result[0] ?? { list: [], metaCounter: [{ total: 0 }] };
    }

    public async removeCommentByAdmin(input: Types.ObjectId): Promise<Comment> {
        const result = await this.commentModel.findByIdAndDelete(input).exec();
        if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
        return result;
    }

    public async getAgentReviewStats(memberId: Types.ObjectId | null, agentId: Types.ObjectId): Promise<AgentReviewStats> {
        const targetAgent = await this.memberService.getMember(null, shapeIntoMongoObjectId(agentId));
        if (targetAgent.memberType !== MemberType.AGENT || targetAgent.memberStatus !== MemberStatus.ACTIVE) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        const aggregate = await this.commentModel
            .aggregate([
                {
                    $match: {
                        commentRefId: agentId,
                        commentGroup: CommentGroup.MEMBER,
                        commentStatus: CommentStatus.ACTIVE,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalReviews: { $sum: 1 },
                        averageRating: { $avg: '$commentRating' },
                    },
                },
            ])
            .exec();

        let canWriteReview = false;
        if (memberId) {
            const writer = await this.memberService.getMember(null, shapeIntoMongoObjectId(memberId));
            if (writer.memberType === MemberType.USER && writer.memberStatus === MemberStatus.ACTIVE) {
                canWriteReview = await this.bookingsService.hasConfirmedOrPaidTourBooking(memberId, String(agentId));
            }
        }

        const totalReviews = aggregate?.[0]?.totalReviews ?? 0;
        const averageRating = aggregate?.[0]?.averageRating ?? 0;
        return {
            totalReviews,
            averageRating: Number(averageRating.toFixed(2)),
            canWriteReview,
        };
    }
}