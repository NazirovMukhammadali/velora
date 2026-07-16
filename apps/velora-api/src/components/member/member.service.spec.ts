import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';

jest.mock('../../libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
	lookupAuthMemberLiked: jest.fn(() => ({ $addFields: { meLiked: [] } })),
}));

import { MemberService } from './member.service';

const execMock = <T>(value: T) => ({
	exec: jest.fn().mockResolvedValue(value),
});

describe('MemberService authorization security', () => {
	let service: MemberService;
	let memberModel: any;
	let authService: any;

	beforeEach(() => {
		memberModel = {
			create: jest.fn(),
			findOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
		};
		authService = {
			hashPassword: jest.fn(async (password: string) => bcrypt.hash(password, 4)),
			comparePasswords: jest.fn(async (plain: string, hashed: string) => bcrypt.compare(plain, hashed)),
			createToken: jest.fn().mockResolvedValue('jwt-token'),
		};

		service = new MemberService(memberModel, {} as any, authService, {} as any, {} as any);
	});

	describe('signup', () => {
		it('rejects ADMIN signup', async () => {
			await expect(
				service.signup({
					memberNick: 'hacker',
					memberPassword: 'secret12',
					memberPhone: '+998901112233',
					memberType: MemberType.ADMIN,
				}),
			).rejects.toEqual(new BadRequestException(Message.ONLY_USER_OR_AGENT_SIGNUP));

			expect(memberModel.create).not.toHaveBeenCalled();
		});

		it('rejects unknown member types', async () => {
			await expect(
				service.signup({
					memberNick: 'hacker',
					memberPassword: 'secret12',
					memberPhone: '+998901112233',
					memberType: 'SUPERADMIN' as MemberType,
				}),
			).rejects.toEqual(new BadRequestException(Message.ONLY_USER_OR_AGENT_SIGNUP));

			expect(memberModel.create).not.toHaveBeenCalled();
		});

		it('stores hashed password and allows USER signup', async () => {
			const plainPassword = 'secret12';
			memberModel.create.mockImplementation(async (input: any) => ({
				...input,
				_id: new Types.ObjectId(),
				memberStatus: MemberStatus.ACTIVE,
			}));

			const result = await service.signup({
				memberNick: 'traveler1',
				memberPassword: plainPassword,
				memberPhone: '+998901112233',
				memberType: MemberType.USER,
			});

			const storedPassword = memberModel.create.mock.calls[0][0].memberPassword;
			expect(storedPassword).not.toBe(plainPassword);
			expect(storedPassword.startsWith('$2')).toBe(true);
			expect(await bcrypt.compare(plainPassword, storedPassword)).toBe(true);
			expect(result.memberPassword).toBeUndefined();
			expect(result.memberType).toBe(MemberType.USER);
			expect(result.accessToken).toBe('jwt-token');
		});

		it('allows AGENT signup with hashed password', async () => {
			const plainPassword = 'agentpass';
			memberModel.create.mockImplementation(async (input: any) => ({
				...input,
				_id: new Types.ObjectId(),
				memberStatus: MemberStatus.ACTIVE,
			}));

			await service.signup({
				memberNick: 'agentone',
				memberPassword: plainPassword,
				memberPhone: '+998901112244',
				memberType: MemberType.AGENT,
			});

			const storedPassword = memberModel.create.mock.calls[0][0].memberPassword;
			expect(storedPassword).not.toBe(plainPassword);
			expect(await bcrypt.compare(plainPassword, storedPassword)).toBe(true);
		});
	});

	describe('updateMember', () => {
		it('prevents self-promotion via memberType', async () => {
			const memberId = new Types.ObjectId();

			await expect(
				service.updateMember(memberId, {
					memberType: MemberType.ADMIN,
				} as any),
			).rejects.toEqual(new BadRequestException(Message.NOT_ALLOWED_REQUEST));

			expect(memberModel.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('prevents self memberStatus changes', async () => {
			const memberId = new Types.ObjectId();

			await expect(
				service.updateMember(memberId, {
					memberStatus: MemberStatus.BLOCK,
				} as any),
			).rejects.toEqual(new BadRequestException(Message.NOT_ALLOWED_REQUEST));

			expect(memberModel.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('rejects raw password updates on updateMember', async () => {
			const memberId = new Types.ObjectId();

			await expect(
				service.updateMember(memberId, {
					memberPassword: 'plaintext1',
				} as any),
			).rejects.toEqual(new BadRequestException(Message.PASSWORD_UPDATE_NOT_ALLOWED));

			expect(memberModel.findOneAndUpdate).not.toHaveBeenCalled();
		});
	});

	describe('changePassword', () => {
		it('hashes the new password and never stores plain text', async () => {
			const memberId = new Types.ObjectId();
			const currentPassword = 'oldpass12';
			const newPassword = 'newpass12';
			const currentHash = await bcrypt.hash(currentPassword, 4);

			memberModel.findOne.mockReturnValue({
				select: () => execMock({
					_id: memberId,
					memberPassword: currentHash,
					memberStatus: MemberStatus.ACTIVE,
				}),
			});

			const updated = {
				_id: memberId,
				memberNick: 'traveler1',
				memberStatus: MemberStatus.ACTIVE,
			};
			memberModel.findOneAndUpdate.mockReturnValue(execMock(updated));

			const result = await service.changePassword(memberId, currentPassword, newPassword);

			expect(authService.hashPassword).toHaveBeenCalledWith(newPassword);
			const updatePayload = memberModel.findOneAndUpdate.mock.calls[0][1];
			expect(updatePayload.memberPassword).not.toBe(newPassword);
			expect(updatePayload.memberPassword.startsWith('$2')).toBe(true);
			expect(await bcrypt.compare(newPassword, updatePayload.memberPassword)).toBe(true);
			expect(result.memberPassword).toBeUndefined();
		});

		it('rejects incorrect current password', async () => {
			const memberId = new Types.ObjectId();
			const currentHash = await bcrypt.hash('oldpass12', 4);

			memberModel.findOne.mockReturnValue({
				select: () => execMock({
					_id: memberId,
					memberPassword: currentHash,
					memberStatus: MemberStatus.ACTIVE,
				}),
			});

			await expect(service.changePassword(memberId, 'wrongpass', 'newpass12')).rejects.toEqual(
				new BadRequestException(Message.WRONG_PASSWORD),
			);
			expect(memberModel.findOneAndUpdate).not.toHaveBeenCalled();
		});
	});

	describe('updateMemberByAdmin', () => {
		it('hashes password before saving', async () => {
			const memberId = new Types.ObjectId();
			const plainPassword = 'adminSet1';
			memberModel.findOneAndUpdate.mockReturnValue(
				execMock({ _id: memberId, memberType: MemberType.USER }),
			);

			await service.updateMemberByAdmin({
				_id: memberId,
				memberPassword: plainPassword,
			} as any);

			const updatePayload = memberModel.findOneAndUpdate.mock.calls[0][1];
			expect(updatePayload.memberPassword).not.toBe(plainPassword);
			expect(updatePayload.memberPassword.startsWith('$2')).toBe(true);
			expect(await bcrypt.compare(plainPassword, updatePayload.memberPassword)).toBe(true);
		});
	});
});
