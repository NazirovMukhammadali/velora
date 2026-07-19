import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import {
	AllBoardArticlesInquiry,
	BoardArticleInput,
	BoardArticlesInquiry,
} from '../../libs/dto/board-article/board-article.input';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { LikeInput } from '../../libs/dto/like/like.input';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { T } from '../../libs/types/common';
import { LikeService } from '../like/like.service';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';

@Injectable()
export class BoardArticleService {
	constructor(
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		private readonly memberService: MemberService,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
	) {}

	public async createBoardArticle(memberId: Types.ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
		input.memberId = memberId;

		try {
			const result = await this.boardArticleModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: 1,
			});
			return result;
		} catch (err) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getBoardArticles(
		memberId: Types.ObjectId | null,
		input: BoardArticlesInquiry,
	): Promise<BoardArticles> {
		const match: T = { articleStatus: BoardArticleStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const search = input?.search ?? {};

		if (search.articleCategory) match.articleCategory = search.articleCategory;
		if (search.memberId) match.memberId = shapeIntoMongoObjectId(search.memberId);
		if (search.text) {
			const regex = new RegExp(search.text, 'i');
			match.$or = [{ articleTitle: regex }, { articleContent: regex }];
		}

		const listStages: any[] = [
			{ $skip: (input.page - 1) * input.limit },
			{ $limit: input.limit },
			lookupMember,
			{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
		];

		if (memberId) {
			listStages.push(lookupAuthMemberLiked(memberId));
		}

		const result = await this.boardArticleModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: listStages,
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const page = result?.[0];
		return {
			list: page?.list ?? [],
			metaCounter: page?.metaCounter?.length ? page.metaCounter : [{ total: 0 }],
		};
	}

	public async getBoardArticle(memberId: Types.ObjectId | null, articleId: string): Promise<BoardArticle> {
		const targetId = shapeIntoMongoObjectId(articleId);
		const result = await this.boardArticleModel
			.findOne({
				_id: targetId,
				articleStatus: BoardArticleStatus.ACTIVE,
			})
			.lean()
			.exec();

		if (!result) throw new NotFoundException(Message.NO_DATA_FOUND);
		const targetArticle = result as BoardArticle;

		if (memberId) {
			const newView = await this.viewService.recordView({
				memberId,
				viewRefId: targetId,
				viewGroup: ViewGroup.ARTICLE,
			});
			if (newView) {
				await this.boardArticleModel.findByIdAndUpdate(targetId, { $inc: { articleViews: 1 } }, { new: true }).exec();
				targetArticle.articleViews++;
			}

			targetArticle.meLiked = await this.likeService.checkLikeExistence({
				memberId,
				likeRefId: targetId,
				likeGroup: LikeGroup.ARTICLE,
			});
		}

		targetArticle.memberData = await this.memberService.getMember(
			null,
			shapeIntoMongoObjectId(targetArticle.memberId),
		);

		return targetArticle;
	}

	public async updateBoardArticle(memberId: Types.ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
		const search: T = {
			_id: input._id,
			memberId,
			articleStatus: { $ne: BoardArticleStatus.DELETE },
		};

		const existing = await this.boardArticleModel.findOne(search).exec();
		if (!existing) throw new BadRequestException(Message.UPDATE_FAILED);

		const result = await this.boardArticleModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		if (
			existing.articleStatus === BoardArticleStatus.ACTIVE &&
			input.articleStatus === BoardArticleStatus.DELETE
		) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}

		return result;
	}

	public async likeTargetBoardArticle(memberId: Types.ObjectId, articleId: Types.ObjectId): Promise<BoardArticle> {
		const targetArticle = await this.boardArticleModel
			.findOne({
				_id: articleId,
				articleStatus: BoardArticleStatus.ACTIVE,
			})
			.exec();

		if (!targetArticle) throw new NotFoundException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId,
			likeRefId: articleId,
			likeGroup: LikeGroup.ARTICLE,
		};
		const modifier = await this.likeService.toggleLike(input);

		const updated = await this.boardArticleModel
			.findByIdAndUpdate(articleId, { $inc: { articleLikes: modifier } }, { new: true })
			.exec();

		if (!updated) throw new BadRequestException(Message.SOMETHING_WENT_WRONG);
		return updated;
	}

	public async getAllBoardArticlesByAdmin(input: AllBoardArticlesInquiry): Promise<BoardArticles> {
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const search = input?.search ?? {};

		if (search.articleStatus) match.articleStatus = search.articleStatus;
		if (search.articleCategory) match.articleCategory = search.articleCategory;

		const result = await this.boardArticleModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const page = result?.[0];
		return {
			list: page?.list ?? [],
			metaCounter: page?.metaCounter?.length ? page.metaCounter : [{ total: 0 }],
		};
	}

	public async updateBoardArticleByAdmin(input: BoardArticleUpdate): Promise<BoardArticle> {
		const existing = await this.boardArticleModel.findById(input._id).exec();
		if (!existing) throw new BadRequestException(Message.UPDATE_FAILED);

		const result = await this.boardArticleModel
			.findOneAndUpdate({ _id: input._id }, input, { new: true })
			.exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		if (
			existing.articleStatus === BoardArticleStatus.ACTIVE &&
			input.articleStatus === BoardArticleStatus.DELETE
		) {
			await this.memberService.memberStatsEditor({
				_id: existing.memberId as Types.ObjectId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		} else if (
			existing.articleStatus === BoardArticleStatus.DELETE &&
			input.articleStatus === BoardArticleStatus.ACTIVE
		) {
			await this.memberService.memberStatsEditor({
				_id: existing.memberId as Types.ObjectId,
				targetKey: 'memberArticles',
				modifier: 1,
			});
		}

		return result;
	}

	public async removeBoardArticleByAdmin(articleId: Types.ObjectId): Promise<BoardArticle> {
		const existing = await this.boardArticleModel
			.findOne({
				_id: articleId,
				articleStatus: { $ne: BoardArticleStatus.DELETE },
			})
			.exec();
		if (!existing) throw new BadRequestException(Message.REMOVE_FAILED);

		const result = await this.boardArticleModel
			.findOneAndUpdate(
				{ _id: articleId, articleStatus: { $ne: BoardArticleStatus.DELETE } },
				{ articleStatus: BoardArticleStatus.DELETE },
				{ new: true },
			)
			.exec();
		if (!result) throw new BadRequestException(Message.REMOVE_FAILED);

		await this.memberService.memberStatsEditor({
			_id: existing.memberId as Types.ObjectId,
			targetKey: 'memberArticles',
			modifier: -1,
		});

		return result;
	}
}
