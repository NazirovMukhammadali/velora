import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
jest.mock('../member/member.service', () => ({
	MemberService: class MemberService {},
}));
jest.mock('../../libs/config', () => ({
	lookupAuthMemberFollowed: jest.fn(() => ({ $match: {} })),
	lookupAuthMemberLiked: jest.fn(() => ({ $match: {} })),
	lookupFollowerData: { $match: {} },
	lookupFollowingData: { $match: {} },
}));
import { FollowService } from './follow.service';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('FollowService', () => {
	let service: FollowService;
	let followModel: any;
	let memberService: any;

	beforeEach(() => {
		followModel = {
			findOne: jest.fn(),
			create: jest.fn(),
			findOneAndDelete: jest.fn(),
			aggregate: jest.fn(),
		};

		memberService = {
			getMember: jest.fn(),
			memberStatsEditor: jest.fn().mockResolvedValue({}),
		};

		service = new FollowService(followModel, memberService);
	});

	const member = (_id: Types.ObjectId, memberType: MemberType, memberStatus = MemberStatus.ACTIVE) => ({
		_id,
		memberType,
		memberStatus,
	});

	it.each([
		[MemberType.USER, MemberType.AGENT],
		[MemberType.USER, MemberType.USER],
		[MemberType.AGENT, MemberType.USER],
		[MemberType.AGENT, MemberType.AGENT],
	])('subscribes when %s follows %s (Instagram-style)', async (followerType, targetType) => {
		const followerId = new Types.ObjectId();
		const followingId = new Types.ObjectId();
		const createdFollow = { _id: new Types.ObjectId(), followerId, followingId };

		memberService.getMember
			.mockResolvedValueOnce(member(followerId, followerType))
			.mockResolvedValueOnce(member(followingId, targetType));
		followModel.findOne.mockReturnValue(execMock(null));
		followModel.create.mockResolvedValue(createdFollow);

		const result = await service.subscribe(followerId, followingId);

		expect(result).toEqual(createdFollow);
		expect(memberService.memberStatsEditor).toHaveBeenCalledTimes(2);
	});

	it('rejects self-follow', async () => {
		const memberId = new Types.ObjectId();

		await expect(service.subscribe(memberId, memberId)).rejects.toBeInstanceOf(InternalServerErrorException);
	});

	it('rejects following an admin', async () => {
		const followerId = new Types.ObjectId();
		const followingId = new Types.ObjectId();

		memberService.getMember
			.mockResolvedValueOnce(member(followerId, MemberType.USER))
			.mockResolvedValueOnce(member(followingId, MemberType.ADMIN));

		await expect(service.subscribe(followerId, followingId)).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects follows involving a blocked member', async () => {
		const followerId = new Types.ObjectId();
		const followingId = new Types.ObjectId();

		memberService.getMember
			.mockResolvedValueOnce(member(followerId, MemberType.USER))
			.mockResolvedValueOnce(member(followingId, MemberType.AGENT, MemberStatus.BLOCK));

		await expect(service.subscribe(followerId, followingId)).rejects.toBeInstanceOf(BadRequestException);
		expect(followModel.create).not.toHaveBeenCalled();
	});

	it('rejects duplicate follow', async () => {
		const followerId = new Types.ObjectId();
		const followingId = new Types.ObjectId();

		memberService.getMember
			.mockResolvedValueOnce(member(followerId, MemberType.USER))
			.mockResolvedValueOnce(member(followingId, MemberType.AGENT));
		followModel.findOne.mockReturnValue(execMock({ _id: new Types.ObjectId() }));

		await expect(service.subscribe(followerId, followingId)).rejects.toBeInstanceOf(BadRequestException);
		expect(followModel.create).not.toHaveBeenCalled();
	});

	it('unsubscribes successfully for existing relation', async () => {
		const followerId = new Types.ObjectId();
		const followingId = new Types.ObjectId();
		const deleted = { _id: new Types.ObjectId(), followerId, followingId };

		memberService.getMember.mockResolvedValue({ _id: followingId, memberType: MemberType.AGENT });
		followModel.findOneAndDelete.mockReturnValue(execMock(deleted));

		const result = await service.unsubscribe(followerId, followingId);

		expect(result).toEqual(deleted);
		expect(memberService.memberStatsEditor).toHaveBeenCalledTimes(2);
	});

	it('fails unsubscribe when relation does not exist', async () => {
		const followerId = new Types.ObjectId();
		const followingId = new Types.ObjectId();

		memberService.getMember.mockResolvedValue({ _id: followingId, memberType: MemberType.AGENT });
		followModel.findOneAndDelete.mockReturnValue(execMock(null));

		await expect(service.unsubscribe(followerId, followingId)).rejects.toBeInstanceOf(InternalServerErrorException);
	});
});
