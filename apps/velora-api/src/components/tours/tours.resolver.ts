import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Tour, Tours } from '../../libs/dto/tour/tour';
import {
	AgentToursInquiry,
	AllToursInquiry,
	PopularToursInquiry,
	TourInput,
	ToursInquiry,
} from '../../libs/dto/tour/tour.input';
import { TourUpdate } from '../../libs/dto/tour/tour.update';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { ToursService } from './tours.service';

@Resolver()
export class ToursResolver {
	/**
	 * Core transactional domain resolver.
	 * Tours own package management and are the only domain connected to booking transactions in MVP.
	 */
	constructor(private readonly toursService: ToursService) {}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Tour)
	public async createTour(@Args('input') input: TourInput, @AuthMember('_id') memberId: Types.ObjectId): Promise<Tour> {
		input.memberId = memberId;
		return await this.toursService.createTour(input);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Tour)
	public async updateTour(
		@Args('input') input: TourUpdate,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Tour> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.toursService.updateTour(memberId, input);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Tour)
	public async removeTour(
		@Args('tourId', { type: () => ID }) tourId: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Tour> {
		return await this.toursService.removeTour(memberId, shapeIntoMongoObjectId(tourId));
	}

	@Query(() => Tours)
	public async getTours(@Args('input') input: ToursInquiry): Promise<Tours> {
		return await this.toursService.getTours(input);
	}

	@Query(() => Tours)
	public async getPopularTours(@Args('input') input: PopularToursInquiry): Promise<Tours> {
		return await this.toursService.getPopularTours(input);
	}

	@Query(() => Tours)
	public async getAgentTours(
		@Args('agentId') agentId: string,
		@Args('input') input: AgentToursInquiry,
	): Promise<Tours> {
		return await this.toursService.getAgentTours(agentId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Tour)
	public async getTourDetail(
		@Args('tourId', { type: () => ID }) tourId: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Tour> {
		return await this.toursService.getTourDetail(memberId, tourId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Tour)
	public async likeTargetTour(
		@Args('tourId', { type: () => ID }) tourId: string,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Tour> {
		return await this.toursService.likeTargetTour(memberId, shapeIntoMongoObjectId(tourId));
	}

	@UseGuards(AuthGuard)
	@Query(() => Tours)
	public async getFavoriteTours(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<Tours> {
		return await this.toursService.getFavoriteTours(memberId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Tours)
	public async getAllToursByAdmin(@Args('input') input: AllToursInquiry): Promise<Tours> {
		return await this.toursService.getAllToursByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Tour)
	public async updateTourByAdmin(@Args('input') input: TourUpdate): Promise<Tour> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.toursService.updateTourByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Tour)
	public async removeTourByAdmin(@Args('tourId', { type: () => ID }) tourId: string): Promise<Tour> {
		return await this.toursService.removeTourByAdmin(shapeIntoMongoObjectId(tourId));
	}
}
