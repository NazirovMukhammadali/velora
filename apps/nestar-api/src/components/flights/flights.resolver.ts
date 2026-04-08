import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Flight, Flights } from '../../libs/dto/flight/flight';
import { FlightsInquiry, FlightInput } from '../../libs/dto/flight/flight.input';
import { FlightsService } from './flights.service';

@Resolver()
export class FlightsResolver {
    constructor(private readonly flightsService: FlightsService) { }

    @Mutation(() => Flight)
    public async createFlight(@Args('input') input: FlightInput): Promise<Flight> {
        console.log('Mutation: createFlight');
        return await this.flightsService.createFlight(input);
    }

    @Query(() => Flights)
    public async getFlights(@Args('input') input: FlightsInquiry): Promise<Flights> {
        console.log('Query: getFlights');
        return await this.flightsService.getFlights(input);
    }
}
