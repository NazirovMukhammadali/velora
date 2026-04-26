import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommentService } from './comment.service';
import { CommentGroup } from '../../libs/enums/comment.enum';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';

jest.mock('../../libs/config', () => ({
    lookupMember: {},
    shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
    exec: jest.fn().mockResolvedValue(value),
});

describe('CommentService', () => {
    let service: CommentService;
    let commentModel: any;
    let memberService: any;
    let bookingsService: any;

    beforeEach(() => {
        commentModel = {
            create: jest.fn(),
            aggregate: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
        };
        memberService = {
            getMember: jest.fn(),
            memberStatsEditor: jest.fn(),
        };
        bookingsService = {
            hasConfirmedOrPaidTourBooking: jest.fn(),
        };
        service = new CommentService(commentModel, memberService, bookingsService);
    });

    it('allows USER to review AGENT after confirmed purchase', async () => {
        const memberId = new Types.ObjectId();
        const agentId = new Types.ObjectId();
        memberService.getMember
            .mockResolvedValueOnce({ _id: memberId, memberType: MemberType.USER, memberStatus: MemberStatus.ACTIVE })
            .mockResolvedValueOnce({ _id: agentId, memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE });
        bookingsService.hasConfirmedOrPaidTourBooking.mockResolvedValue(true);
        commentModel.create.mockResolvedValue({ _id: new Types.ObjectId(), memberId, commentRefId: agentId, commentRating: 5 });

        const result = await service.createComment(memberId, {
            commentGroup: CommentGroup.MEMBER,
            commentContent: 'Excellent guide',
            commentRating: 5,
            commentRefId: agentId,
        } as any);

        expect(result.commentRating).toBe(5);
        expect(memberService.memberStatsEditor).toHaveBeenCalled();
    });

    it('rejects review when user has not purchased agent package', async () => {
        const memberId = new Types.ObjectId();
        const agentId = new Types.ObjectId();
        memberService.getMember
            .mockResolvedValueOnce({ _id: memberId, memberType: MemberType.USER, memberStatus: MemberStatus.ACTIVE })
            .mockResolvedValueOnce({ _id: agentId, memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE });
        bookingsService.hasConfirmedOrPaidTourBooking.mockResolvedValue(false);

        await expect(
            service.createComment(memberId, {
                commentGroup: CommentGroup.MEMBER,
                commentContent: 'Nice trip',
                commentRating: 4,
                commentRefId: agentId,
            } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns rating stats with canWriteReview=true for eligible user', async () => {
        const memberId = new Types.ObjectId();
        const agentId = new Types.ObjectId();
        memberService.getMember
            .mockResolvedValueOnce({ _id: agentId, memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE })
            .mockResolvedValueOnce({ _id: memberId, memberType: MemberType.USER, memberStatus: MemberStatus.ACTIVE });
        bookingsService.hasConfirmedOrPaidTourBooking.mockResolvedValue(true);
        commentModel.aggregate.mockReturnValue(execMock([{ totalReviews: 3, averageRating: 4.666 }]));

        const result = await service.getAgentReviewStats(memberId, agentId);

        expect(result.totalReviews).toBe(3);
        expect(result.averageRating).toBe(4.67);
        expect(result.canWriteReview).toBe(true);
    });
});
