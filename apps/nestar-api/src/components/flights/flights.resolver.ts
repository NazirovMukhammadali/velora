import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Flight, Flights } from '../../libs/dto/flight/flight';
import { FlightsInquiry, FlightInput } from '../../libs/dto/flight/flight.input';
import { FlightsService } from './flights.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
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
}
