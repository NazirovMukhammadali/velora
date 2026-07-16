import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { UseGuards } from '@nestjs/common';
import {
	AgentsInquiry,
	ChangePasswordInput,
	LoginInput,
	MemberInput,
	MembersInquiry,
} from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Types } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { assertSafeUploadTarget, saveSecureImageUpload } from '../../libs/upload/upload.security';

@Resolver()
export class MemberResolver {
	constructor(private readonly memberService: MemberService) {}

	@Mutation(() => Member) // Member.ts class
	public async signup(@Args('input') input: MemberInput): Promise<Member> {
		return await this.memberService.signup(input);
	}

	@Mutation(() => Member)
	public async login(@Args('input') input: LoginInput): Promise<Member> {
		return await this.memberService.login(input);
	}

	@UseGuards(AuthGuard)
	@Query(() => String)
	public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
		return `Hi ${memberNick}`;
	}

	@Roles(MemberType.USER, MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => String)
	public async checkAuthRoles(@AuthMember() authMember: Member) {
		return `Hi ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`;
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdate,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		delete input._id;
		return await this.memberService.updateMember(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async changePassword(
		@Args('input') input: ChangePasswordInput,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		return await this.memberService.changePassword(memberId, input.currentPassword, input.newPassword);
	}

	// Retriver
	@UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getMember(
		@Args('memberId') input: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getMember(memberId, targetId); // memberId(koruvchi) // targetId(izlanovchi)
	}

	@UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getAgents(
		@Args('input') input: AgentsInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Members> {
		return await this.memberService.getAgents(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async likeTargetMember(
		@Args('memberId') input: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Member> {
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.memberService.likeTargetMember(memberId, likeRefId);
	}

	/* ADMIN */

	// Authoriztion: ADMIN
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Members)
	public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Members> {
		return await this.memberService.getAllMembersByAdmin(input);
	}

	// Authoriztion: ADMIN
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
		return await this.memberService.updateMemberByAdmin(input);
	}

	/* UPLOADER */

	@UseGuards(AuthGuard)
	@Mutation((returns) => String)
	public async imageUploader(
		@Args({ name: 'file', type: () => GraphQLUpload })
		{ createReadStream, filename, mimetype }: FileUpload,
		@Args('target') target: string,
	): Promise<string> {
		return await saveSecureImageUpload({
			filename,
			mimetype,
			createReadStream,
			target,
		});
	}

	@UseGuards(AuthGuard)
	@Mutation((returns) => [String])
	public async imagesUploader(
		@Args('files', { type: () => [GraphQLUpload] })
		files: Promise<FileUpload>[],
		@Args('target') target: string,
	): Promise<string[]> {
		assertSafeUploadTarget(target);

		const uploadedImages: string[] = [];
		const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<void> => {
			try {
				if (!img) return;
				const { filename, mimetype, createReadStream } = await img;
				uploadedImages[index] = await saveSecureImageUpload({
					filename,
					mimetype,
					createReadStream,
					target,
				});
			} catch (err) {
				// Skip invalid files in multi-upload; errors are real Error/BadRequestException objects.
				if (!(err instanceof Error)) {
					throw new Error('Upload failed');
				}
			}
		});

		await Promise.all(promisedList);
		return uploadedImages.filter((url) => !!url);
	}
}
