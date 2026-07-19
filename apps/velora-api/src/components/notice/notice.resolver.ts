import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import {
	AllNoticesInquiry,
	InquiryInput,
	NoticeInput,
	NoticesInquiry,
} from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { NoticeService } from './notice.service';

@Resolver()
export class NoticeResolver {
	constructor(private readonly noticeService: NoticeService) {}

	@UseGuards(WithoutGuard)
	@Query(() => Notices)
	public async getNotices(@Args('input') input: NoticesInquiry): Promise<Notices> {
		return await this.noticeService.getNotices(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Notice)
	public async getNotice(@Args('noticeId') noticeId: string): Promise<Notice> {
		return await this.noticeService.getNotice(noticeId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notice)
	public async createInquiry(
		@Args('input') input: InquiryInput,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Notice> {
		return await this.noticeService.createInquiry(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Notices)
	public async getMyInquiries(
		@Args('input') input: NoticesInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Notices> {
		return await this.noticeService.getMyInquiries(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notice)
	public async createNoticeByAdmin(
		@Args('input') input: NoticeInput,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Notice> {
		return await this.noticeService.createNoticeByAdmin(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Notices)
	public async getAllNoticesByAdmin(@Args('input') input: AllNoticesInquiry): Promise<Notices> {
		return await this.noticeService.getAllNoticesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notice)
	public async updateNoticeByAdmin(@Args('input') input: NoticeUpdate): Promise<Notice> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.noticeService.updateNoticeByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notice)
	public async removeNoticeByAdmin(@Args('noticeId') noticeId: string): Promise<Notice> {
		return await this.noticeService.removeNoticeByAdmin(shapeIntoMongoObjectId(noticeId));
	}
}
