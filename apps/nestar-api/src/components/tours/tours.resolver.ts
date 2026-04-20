import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { Tour, Tours } from '../../libs/dto/tour/tour';
import { AgentToursInquiry, TourInput, ToursInquiry } from '../../libs/dto/tour/tour.input';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ToursService } from './tours.service';

@Resolver()
export class ToursResolver {
    constructor(private readonly toursService: ToursService) { }

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Mutation(() => Tour)
    public async createTour(
        @Args('input') input: TourInput,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Tour> {
        input.memberId = memberId;
        return await this.toursService.createTour(input);
    }

    @Query(() => Tours)
    public async getTours(@Args('input') input: ToursInquiry): Promise<Tours> {
        return await this.toursService.getTours(input);
    }

    @Query(() => Tours)
    public async getAgentTours(
        @Args('agentId') agentId: string,
        @Args('input') input: AgentToursInquiry,
    ): Promise<Tours> {
        return await this.toursService.getAgentTours(agentId, input);
    }

    @Query(() => Tour)
    public async getTourDetail(
        @Args('tourId', { type: () => ID }) tourId: string,
    ): Promise<Tour> {
        return await this.toursService.getTourDetail(tourId);
    }
}
