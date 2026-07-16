import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { BoardArticleService } from './board-article.service';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
	lookupMember: { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'memberData' } },
	lookupAuthMemberLiked: jest.fn(() => ({ $lookup: { from: 'likes', as: 'meLiked' } })),
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('BoardArticleService', () => {
	let service: BoardArticleService;
	let boardArticleModel: any;
	let memberService: any;
	let likeService: any;
	let viewService: any;

	beforeEach(() => {
		boardArticleModel = {
			create: jest.fn(),
			findOne: jest.fn(),
			findById: jest.fn(),
			findOneAndUpdate: jest.fn(),
			findByIdAndUpdate: jest.fn(),
			aggregate: jest.fn(),
		};
		memberService = {
			getMember: jest.fn(),
			memberStatsEditor: jest.fn(),
		};
		likeService = {
			checkLikeExistence: jest.fn(),
			toggleLike: jest.fn(),
		};
		viewService = {
			recordView: jest.fn(),
		};

		service = new BoardArticleService(boardArticleModel, memberService, likeService, viewService);
	});

	it('creates article and increments memberArticles', async () => {
		const memberId = new Types.ObjectId();
		const created = {
			_id: new Types.ObjectId(),
			memberId,
			articleTitle: 'Hello',
			articleStatus: BoardArticleStatus.ACTIVE,
		};
		boardArticleModel.create.mockResolvedValue(created);

		const result = await service.createBoardArticle(memberId, {
			articleCategory: 'FREE' as any,
			articleTitle: 'Hello',
			articleContent: 'World content here',
		});

		expect(result).toEqual(created);
		expect(memberService.memberStatsEditor).toHaveBeenCalledWith({
			_id: memberId,
			targetKey: 'memberArticles',
			modifier: 1,
		});
	});

	it('returns empty-safe board article listing', async () => {
		boardArticleModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getBoardArticles(null, {
			page: 1,
			limit: 6,
			search: {},
		} as any);

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('returns empty-safe admin listing', async () => {
		boardArticleModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getAllBoardArticlesByAdmin({
			page: 1,
			limit: 10,
			search: {},
		} as any);

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('updates owned article only', async () => {
		const memberId = new Types.ObjectId();
		const articleId = new Types.ObjectId();
		const existing = {
			_id: articleId,
			memberId,
			articleStatus: BoardArticleStatus.ACTIVE,
		};
		const updated = { ...existing, articleTitle: 'Updated title' };

		boardArticleModel.findOne.mockReturnValue(execMock(existing));
		boardArticleModel.findOneAndUpdate.mockReturnValue(execMock(updated));

		const result = await service.updateBoardArticle(memberId, {
			_id: articleId,
			articleTitle: 'Updated title',
		} as any);

		expect(result.articleTitle).toBe('Updated title');
		expect(boardArticleModel.findOneAndUpdate).toHaveBeenCalled();
	});

	it('rejects update when not owner', async () => {
		const memberId = new Types.ObjectId();
		boardArticleModel.findOne.mockReturnValue(execMock(null));

		await expect(
			service.updateBoardArticle(memberId, { _id: new Types.ObjectId(), articleTitle: 'Nope' } as any),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('decrements memberArticles when owner soft-deletes', async () => {
		const memberId = new Types.ObjectId();
		const articleId = new Types.ObjectId();
		const existing = {
			_id: articleId,
			memberId,
			articleStatus: BoardArticleStatus.ACTIVE,
		};
		const deleted = { ...existing, articleStatus: BoardArticleStatus.DELETE };

		boardArticleModel.findOne.mockReturnValue(execMock(existing));
		boardArticleModel.findOneAndUpdate.mockReturnValue(execMock(deleted));

		await service.updateBoardArticle(memberId, {
			_id: articleId,
			articleStatus: BoardArticleStatus.DELETE,
		} as any);

		expect(memberService.memberStatsEditor).toHaveBeenCalledWith({
			_id: memberId,
			targetKey: 'memberArticles',
			modifier: -1,
		});
	});

	it('records view and populates like/member data on detail', async () => {
		const memberId = new Types.ObjectId();
		const authorId = new Types.ObjectId();
		const articleId = new Types.ObjectId().toString();
		const found = {
			_id: new Types.ObjectId(articleId),
			memberId: authorId,
			articleViews: 1,
			articleStatus: BoardArticleStatus.ACTIVE,
		};

		boardArticleModel.findOne.mockReturnValue({
			lean: () => ({
				exec: jest.fn().mockResolvedValue(found),
			}),
		});
		viewService.recordView.mockResolvedValue({ _id: new Types.ObjectId(), viewGroup: ViewGroup.ARTICLE });
		boardArticleModel.findByIdAndUpdate.mockReturnValue(execMock({ ...found, articleViews: 2 }));
		memberService.getMember.mockResolvedValue({ _id: authorId, memberNick: 'writer' });
		likeService.checkLikeExistence.mockResolvedValue([{ myFavorite: true }]);

		const result = await service.getBoardArticle(memberId, articleId);

		expect(viewService.recordView).toHaveBeenCalled();
		expect(result.memberData).toEqual(expect.objectContaining({ memberNick: 'writer' }));
		expect(result.meLiked).toEqual([{ myFavorite: true }]);
		expect(result.articleViews).toBe(2);
	});

	it('likes target article and updates like count', async () => {
		const memberId = new Types.ObjectId();
		const articleId = new Types.ObjectId();
		boardArticleModel.findOne.mockReturnValue(
			execMock({ _id: articleId, articleStatus: BoardArticleStatus.ACTIVE }),
		);
		likeService.toggleLike.mockResolvedValue(1);
		boardArticleModel.findByIdAndUpdate.mockReturnValue(execMock({ _id: articleId, articleLikes: 4 }));

		const result = await service.likeTargetBoardArticle(memberId, articleId);

		expect(likeService.toggleLike).toHaveBeenCalled();
		expect(result.articleLikes).toBe(4);
	});

	it('throws when liking missing article', async () => {
		boardArticleModel.findOne.mockReturnValue(execMock(null));

		await expect(service.likeTargetBoardArticle(new Types.ObjectId(), new Types.ObjectId())).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('soft deletes by admin and decrements memberArticles', async () => {
		const articleId = new Types.ObjectId();
		const authorId = new Types.ObjectId();
		const existing = {
			_id: articleId,
			memberId: authorId,
			articleStatus: BoardArticleStatus.ACTIVE,
		};
		const removed = { ...existing, articleStatus: BoardArticleStatus.DELETE };

		boardArticleModel.findOne.mockReturnValue(execMock(existing));
		boardArticleModel.findOneAndUpdate.mockReturnValue(execMock(removed));

		const result = await service.removeBoardArticleByAdmin(articleId);

		expect(result.articleStatus).toBe(BoardArticleStatus.DELETE);
		expect(memberService.memberStatsEditor).toHaveBeenCalledWith({
			_id: authorId,
			targetKey: 'memberArticles',
			modifier: -1,
		});
	});
});
