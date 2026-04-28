import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ToursService } from './tours.service';
import { TourStatus } from '../../libs/enums/tour.enum';
import { ViewGroup } from '../../libs/enums/view.enum';

jest.mock('../../libs/config', () => ({
    shapeIntoMongoObjectId: jest.fn((value) => value),
}));

const execMock = <T>(value: T) => ({
    exec: jest.fn().mockResolvedValue(value),
});

describe('ToursService', () => {
    let service: ToursService;
    let tourModel: any;
    let memberService: any;
    let likeService: any;
    let viewService: any;

    beforeEach(() => {
        tourModel = {
            findOneAndUpdate: jest.fn(),
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            aggregate: jest.fn(),
        };
        memberService = {
            getMember: jest.fn(),
        };
        likeService = {
            checkLikeExistence: jest.fn(),
            toggleLike: jest.fn(),
            getFavoriteTours: jest.fn(),
        };
        viewService = {
            recordView: jest.fn(),
        };

        service = new ToursService(tourModel, memberService, likeService, viewService);
    });

    it('updates owned tour only', async () => {
        const memberId = new Types.ObjectId();
        const updated = { _id: new Types.ObjectId(), memberId, tourTitle: 'Updated' };
        tourModel.findOneAndUpdate.mockReturnValue(execMock(updated));

        const result = await service.updateTour(memberId, { _id: updated._id, tourTitle: 'Updated' } as any);

        expect(result).toEqual(updated);
        expect(tourModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('rejects update when not owner', async () => {
        const memberId = new Types.ObjectId();
        tourModel.findOneAndUpdate.mockReturnValue(execMock(null));

        await expect(service.updateTour(memberId, { _id: new Types.ObjectId() } as any)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('soft deletes owned tour', async () => {
        const memberId = new Types.ObjectId();
        const removed = { _id: new Types.ObjectId(), memberId, tourStatus: TourStatus.DELETE };
        tourModel.findOneAndUpdate.mockReturnValue(execMock(removed));

        const result = await service.removeTour(memberId, removed._id as any);

        expect(result.tourStatus).toBe(TourStatus.DELETE);
    });

    it('records view and populates like/member data in tour detail', async () => {
        const memberId = new Types.ObjectId();
        const tourId = new Types.ObjectId().toString();
        const foundTour = {
            _id: new Types.ObjectId(),
            memberId: new Types.ObjectId(),
            tourViews: 1,
            tourStatus: TourStatus.ACTIVE,
        };

        tourModel.findOne.mockReturnValue({
            lean: () => ({
                exec: jest.fn().mockResolvedValue(foundTour),
            }),
        });
        viewService.recordView.mockResolvedValue({ _id: new Types.ObjectId(), viewGroup: ViewGroup.TOUR });
        tourModel.findByIdAndUpdate.mockReturnValue(execMock({ ...foundTour, tourViews: 2 }));
        memberService.getMember.mockResolvedValue({ _id: foundTour.memberId, memberNick: 'agent' });
        likeService.checkLikeExistence.mockResolvedValue([{ myFavorite: true }]);

        const result = await service.getTourDetail(memberId, tourId);

        expect(viewService.recordView).toHaveBeenCalled();
        expect(result.memberData.memberNick).toBe('agent');
        expect(result.meLiked[0].myFavorite).toBe(true);
        expect(result.tourViews).toBe(2);
    });

    it('delegates favorite tours query to LikeService', async () => {
        const memberId = new Types.ObjectId();
        const expected = { list: [{ _id: new Types.ObjectId() }], metaCounter: [{ total: 1 }] };
        likeService.getFavoriteTours.mockResolvedValue(expected);

        const result = await service.getFavoriteTours(memberId, { page: 1, limit: 10 } as any);

        expect(result).toEqual(expected);
        expect(likeService.getFavoriteTours).toHaveBeenCalledWith(memberId, { page: 1, limit: 10 });
    });

    it('returns empty-safe admin listing', async () => {
        tourModel.aggregate.mockReturnValue(execMock([]));

        const result = await service.getAllToursByAdmin({
            page: 1,
            limit: 10,
            search: {},
        } as any);

        expect(result.list).toEqual([]);
        expect(result.metaCounter[0].total).toBe(0);
    });

    it('returns popular tours sorted query result', async () => {
        const popular = {
            list: [{ _id: new Types.ObjectId(), tourLikes: 12, tourViews: 120 }],
            metaCounter: [{ total: 1 }],
        };
        tourModel.aggregate.mockReturnValue(execMock([popular]));

        const result = await service.getPopularTours({ page: 1, limit: 8 } as any);

        expect(result).toEqual(popular);
        expect(tourModel.aggregate).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    $match: expect.objectContaining({
                        tourStatus: TourStatus.ACTIVE,
                        tourSoldCount: { $gt: 0 },
                    }),
                }),
                expect.objectContaining({
                    $sort: expect.objectContaining({
                        tourSoldCount: -1,
                        tourLikes: -1,
                        tourViews: -1,
                    }),
                }),
            ]),
        );
    });

    it('rejects getAgentTours when member is not active agent', async () => {
        memberService.getMember.mockResolvedValue({
            _id: new Types.ObjectId(),
            memberType: 'USER',
            memberStatus: 'ACTIVE',
        });

        await expect(
            service.getAgentTours(new Types.ObjectId().toString(), { page: 1, limit: 5 } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('soft deletes tour by admin', async () => {
        const deleted = { _id: new Types.ObjectId(), tourStatus: TourStatus.DELETE };
        tourModel.findOneAndUpdate.mockReturnValue(execMock(deleted));

        const result = await service.removeTourByAdmin(deleted._id as any);

        expect(result).toEqual(deleted);
    });

    it('throws when like target tour does not exist', async () => {
        tourModel.findOne.mockReturnValue(execMock(null));

        await expect(service.likeTargetTour(new Types.ObjectId(), new Types.ObjectId() as any)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });
});
