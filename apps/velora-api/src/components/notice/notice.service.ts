import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import {
	AllNoticesInquiry,
	InquiryInput,
	NoticeInput,
	NoticesInquiry,
} from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { Direction, Message } from '../../libs/enums/common.enum';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notice.enum';
import { T } from '../../libs/types/common';

const PUBLIC_NOTICE_CATEGORIES = [NoticeCategory.NOTICE, NoticeCategory.EVENT, NoticeCategory.TERMS];

@Injectable()
export class NoticeService {
	constructor(@InjectModel('Notice') private readonly noticeModel: Model<Notice>) {}

	public async getNotices(input: NoticesInquiry): Promise<Notices> {
		const match: T = { noticeStatus: NoticeStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const search = input?.search ?? {};

		if (search.noticeCategory) {
			match.noticeCategory = search.noticeCategory;
		} else {
			match.noticeCategory = { $in: PUBLIC_NOTICE_CATEGORIES };
		}

		if (search.text) {
			const regex = new RegExp(search.text, 'i');
			match.$or = [{ noticeTitle: regex }, { noticeContent: regex }];
		}

		const result = await this.noticeModel
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

	public async getNotice(noticeId: string): Promise<Notice> {
		const targetId = shapeIntoMongoObjectId(noticeId);
		const result = await this.noticeModel
			.aggregate([
				{
					$match: {
						_id: targetId,
						noticeStatus: NoticeStatus.ACTIVE,
						noticeCategory: { $in: PUBLIC_NOTICE_CATEGORIES },
					},
				},
				lookupMember,
				{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
			])
			.exec();

		const notice = result?.[0];
		if (!notice) throw new NotFoundException(Message.NO_DATA_FOUND);
		return notice as Notice;
	}

	public async createInquiry(memberId: Types.ObjectId, input: InquiryInput): Promise<Notice> {
		try {
			return await this.noticeModel.create({
				noticeCategory: NoticeCategory.INQUIRY,
				noticeStatus: NoticeStatus.ACTIVE,
				noticeTitle: input.noticeTitle,
				noticeContent: input.noticeContent,
				memberId,
			});
		} catch (err) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getMyInquiries(memberId: Types.ObjectId, input: NoticesInquiry): Promise<Notices> {
		const match: T = {
			memberId,
			noticeCategory: NoticeCategory.INQUIRY,
			noticeStatus: { $ne: NoticeStatus.DELETE },
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const search = input?.search ?? {};

		if (search.text) {
			const regex = new RegExp(search.text, 'i');
			match.$or = [{ noticeTitle: regex }, { noticeContent: regex }];
		}

		const result = await this.noticeModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
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

	public async createNoticeByAdmin(memberId: Types.ObjectId, input: NoticeInput): Promise<Notice> {
		if (input.noticeCategory === NoticeCategory.INQUIRY) {
			throw new BadRequestException(Message.BAD_REQUEST);
		}

		try {
			return await this.noticeModel.create({
				...input,
				noticeStatus: input.noticeStatus ?? NoticeStatus.ACTIVE,
				memberId,
			});
		} catch (err) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getAllNoticesByAdmin(input: AllNoticesInquiry): Promise<Notices> {
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const search = input?.search ?? {};

		if (search.noticeStatus) match.noticeStatus = search.noticeStatus;
		if (search.noticeCategory) match.noticeCategory = search.noticeCategory;
		if (search.text) {
			const regex = new RegExp(search.text, 'i');
			match.$or = [{ noticeTitle: regex }, { noticeContent: regex }];
		}

		const result = await this.noticeModel
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

	public async updateNoticeByAdmin(input: NoticeUpdate): Promise<Notice> {
		const search: T = {
			_id: input._id,
			noticeStatus: { $ne: NoticeStatus.DELETE },
		};

		const result = await this.noticeModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}

	public async removeNoticeByAdmin(noticeId: Types.ObjectId): Promise<Notice> {
		const result = await this.noticeModel.findByIdAndDelete(noticeId).exec();
		if (!result) throw new BadRequestException(Message.REMOVE_FAILED);
		return result;
	}
}
