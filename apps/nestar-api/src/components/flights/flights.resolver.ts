import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Flight, Flights } from '../../libs/dto/flight/flight';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { FlightsInquiry, FlightInput } from '../../libs/dto/flight/flight.input';
import { FlightsService } from './flights.service';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { MemberType } from '../../libs/enums/member.enum';

@Resolver()
export class FlightsResolver {
    constructor(private readonly flightsService: FlightsService) { }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Flight)
    public async createFlight(@Args('input') input: FlightInput): Promise<Flight> {
        return await this.flightsService.createFlight(input);
    }

    @Query(() => Flights)
    public async getFlights(@Args('input') input: FlightsInquiry): Promise<Flights> {
        return await this.flightsService.getFlights(input);
    }

    @UseGuards(WithoutGuard)
    @Query(() => Flight)
    public async getFlightDetail(
        @Args('flightId', { type: () => ID }) flightId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Flight> {
        return await this.flightsService.getFlightDetail(memberId, flightId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Flight)
    public async likeTargetFlight(
        @Args('flightId', { type: () => ID }) flightId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Flight> {
        return await this.flightsService.likeTargetFlight(memberId, shapeIntoMongoObjectId(flightId));
    }

    @UseGuards(AuthGuard)
    @Query(() => Flights)
    public async getFavoriteFlights(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Flights> {
        return await this.flightsService.getFavoriteFlights(memberId, input);
    }
}
