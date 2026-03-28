import { BadRequestException, Injectable, InternalServerErrorException, } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Comment, Comments } from "../../libs/dto/comment/comment";
import { MemberService } from "../member/member.service";
import { PropertyService } from "../property/property.service";
import { BoardArticleService } from "../board-article/board-article.service";
import { CommentInput, CommentsInquiry } from "../../libs/dto/comment/comment.input";
import { Direction, Message } from "../../libs/enums/common.enum";
import { CommentGroup, CommentStatus } from "../../libs/enums/comment.enum";
import { CommentUpdate } from "../../libs/dto/comment/comment.update";
import { T } from "../../libs/types/common";
import { lookupMember } from "../../libs/config";

@Injectable()
export class CommentService {
    constructor(
        @InjectModel("Comment") private readonly commentModel: Model<Comment>,
        private readonly memberService: MemberService,
        private readonly propertyService: PropertyService,
        private readonly boardArticleService: BoardArticleService
    ) { }

    public async createComment(
        memberId: Types.ObjectId,
        input: CommentInput
    ): Promise<Comment> {
        input.memberId = memberId; // murojatchini inputni ichiga joylndi

        let result: Comment | null = null;
        try {
            result = await this.commentModel.create(input);
        } catch (err) {
            console.log("Error, Service.model:", err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }

        switch (
        input.commentGroup // krb kelyotgan inputni ichidagi commentGroup ga qarab switch caselar hosl qlndi
        ) {
            case CommentGroup.PROPERTY:
                await this.propertyService.propertyStatsEditor({
                    _id: input.commentRefId,
                    targetKey: "propertyComments", // propertyComments ni sonini 1ga oshradi
                    modifier: 1,
                });
                break;
            case CommentGroup.ARTICLE:
                await this.boardArticleService.boardArticleStatsEditor({
                    _id: input.commentRefId,
                    targetKey: "articleComments",
                    modifier: 1,
                });
                break;
            case CommentGroup.MEMBER:
                await this.memberService.memberStatsEditor({
                    _id: input.commentRefId,
                    targetKey: "memberComments",
                    modifier: 1,
                });
                break;
        }

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
        memberId: Types.ObjectId,
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
        if (!result.length)
            throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        return result[0];
    }

    public async removeCommentByAdmin(input: Types.ObjectId): Promise<Comment> {
        const result = await this.commentModel.findByIdAndDelete(input).exec();
        if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
        return result;
    }
}