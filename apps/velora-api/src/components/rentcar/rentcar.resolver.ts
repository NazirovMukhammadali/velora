import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { AllRentcarsInquiry, RentcarInput, RentcarsInquiry } from '../../libs/dto/rentcar/rentcar.input';
import { RentcarUpdate } from '../../libs/dto/rentcar/rentcar.update';
import { Rentcar, Rentcars } from '../../libs/dto/rentcar/rentcar';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { RentcarService } from './rentcar.service';

@Resolver()
export class RentcarResolver {
	/**
	 * Discovery-only resolver.
	 * By contract, rentcar does not own booking mutations in MVP.
	 */
	constructor(private readonly rentcarService: RentcarService) {}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Rentcar)
	public async createRentcar(@Args('input') input: RentcarInput): Promise<Rentcar> {
		return await this.rentcarService.createRentcar(input);
	}

	@Query(() => Rentcars)
	public async getRentcars(@Args('input') input: RentcarsInquiry): Promise<Rentcars> {
		return await this.rentcarService.getRentcars(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Rentcar)
	public async getRentcarDetail(
		@Args('rentcarId', { type: () => ID }) rentcarId: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Rentcar> {
		return await this.rentcarService.getRentcarDetail(memberId, rentcarId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Rentcar)
	public async likeTargetRentcar(
		@Args('rentcarId', { type: () => ID }) rentcarId: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Rentcar> {
		return await this.rentcarService.likeTargetRentcar(memberId, shapeIntoMongoObjectId(rentcarId));
	}

	@UseGuards(AuthGuard)
	@Query(() => Rentcars)
	public async getFavoriteRentcars(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Rentcars> {
		return await this.rentcarService.getFavoriteRentcars(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Rentcars)
	public async getAllRentcarsByAdmin(@Args('input') input: AllRentcarsInquiry): Promise<Rentcars> {
		return await this.rentcarService.getAllRentcarsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Rentcar)
	public async updateRentcarByAdmin(@Args('input') input: RentcarUpdate): Promise<Rentcar> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.rentcarService.updateRentcarByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Rentcar)
	public async removeRentcarByAdmin(@Args('rentcarId', { type: () => ID }) rentcarId: string): Promise<Rentcar> {
		return await this.rentcarService.removeRentcarByAdmin(shapeIntoMongoObjectId(rentcarId));
	}
}
