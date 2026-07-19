import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notice.enum';
import { NoticeService } from './notice.service';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
	lookupMember: { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'memberData' } },
}));

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('NoticeService', () => {
	let service: NoticeService;
	let noticeModel: any;

	beforeEach(() => {
		noticeModel = {
			create: jest.fn(),
			findOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
			findByIdAndDelete: jest.fn(),
			aggregate: jest.fn(),
		};
		service = new NoticeService(noticeModel);
	});

	it('returns empty-safe public notice listing', async () => {
		noticeModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getNotices({
			page: 1,
			limit: 10,
			search: {},
		} as any);

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});

	it('throws when notice detail is missing', async () => {
		noticeModel.aggregate.mockReturnValue(execMock([]));

		await expect(service.getNotice(new Types.ObjectId().toHexString())).rejects.toBeInstanceOf(NotFoundException);
	});

	it('creates inquiry for authenticated member', async () => {
		const memberId = new Types.ObjectId();
		const created = {
			_id: new Types.ObjectId(),
			memberId,
			noticeCategory: NoticeCategory.INQUIRY,
			noticeTitle: 'Booking help',
		};
		noticeModel.create.mockResolvedValue(created);

		const result = await service.createInquiry(memberId, {
			noticeTitle: 'Booking help',
			noticeContent: 'I need help with my booking details please',
		});

		expect(result).toEqual(created);
		expect(noticeModel.create).toHaveBeenCalledWith(
			expect.objectContaining({
				noticeCategory: NoticeCategory.INQUIRY,
				memberId,
			}),
		);
	});

	it('lists only my inquiries', async () => {
		const memberId = new Types.ObjectId();
		noticeModel.aggregate.mockReturnValue(
			execMock([
				{
					list: [{ noticeTitle: 'Mine', memberId }],
					metaCounter: [{ total: 1 }],
				},
			]),
		);

		const result = await service.getMyInquiries(memberId, { page: 1, limit: 10 } as any);
		expect(result.list).toHaveLength(1);
		expect(result.metaCounter[0].total).toBe(1);
	});

	it('rejects admin create with INQUIRY category', async () => {
		await expect(
			service.createNoticeByAdmin(new Types.ObjectId(), {
				noticeCategory: NoticeCategory.INQUIRY,
				noticeTitle: 'Nope',
				noticeContent: 'Should not work for admin notice create',
			} as any),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('creates notice by admin', async () => {
		const memberId = new Types.ObjectId();
		const created = {
			_id: new Types.ObjectId(),
			noticeCategory: NoticeCategory.NOTICE,
			noticeStatus: NoticeStatus.ACTIVE,
			memberId,
		};
		noticeModel.create.mockResolvedValue(created);

		const result = await service.createNoticeByAdmin(memberId, {
			noticeCategory: NoticeCategory.NOTICE,
			noticeTitle: 'Summer promo',
			noticeContent: 'Book early and save on selected tours this season',
		});

		expect(result).toEqual(created);
	});

	it('updates notice by admin', async () => {
		const updated = { _id: new Types.ObjectId(), noticeTitle: 'Updated' };
		noticeModel.findOneAndUpdate.mockReturnValue(execMock(updated));

		const result = await service.updateNoticeByAdmin({
			_id: updated._id,
			noticeTitle: 'Updated',
		} as any);

		expect(result.noticeTitle).toBe('Updated');
	});

	it('removes notice by admin', async () => {
		const removed = { _id: new Types.ObjectId() };
		noticeModel.findByIdAndDelete.mockReturnValue(execMock(removed));

		const result = await service.removeNoticeByAdmin(removed._id);
		expect(result).toEqual(removed);
	});

	it('returns empty-safe admin listing', async () => {
		noticeModel.aggregate.mockReturnValue(execMock([]));

		const result = await service.getAllNoticesByAdmin({
			page: 1,
			limit: 10,
			search: {},
		} as any);

		expect(result.list).toEqual([]);
		expect(result.metaCounter[0].total).toBe(0);
	});
});
