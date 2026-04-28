import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { FlightCabinClass, FlightStatus } from '../../enums/flight.enum';
import { Direction } from '../../enums/common.enum';

const availableFlightSorts = ['createdAt', 'updatedAt', 'departureTime', 'arrivalTime', 'basePrice', 'availableSeats'];

@InputType()
export class FlightInput {
	@IsNotEmpty()
	@Field(() => String)
	airline: string;

	@IsNotEmpty()
	@Field(() => String)
	flightNumber: string;

	@IsNotEmpty()
	@Field(() => String)
	departureAirport: string;

	@IsNotEmpty()
	@Field(() => String)
	arrivalAirport: string;

	@IsNotEmpty()
	@Field(() => Date)
	departureTime: Date;

	@IsNotEmpty()
	@Field(() => Date)
	arrivalTime: Date;

	@IsNotEmpty()
	@Field(() => FlightCabinClass)
	cabinClass: FlightCabinClass;

	@IsNotEmpty()
	@Min(0)
	@Field(() => Int)
	availableSeats: number;

	@IsNotEmpty()
	@Min(0)
	@Field(() => Number)
	basePrice: number;

	@IsOptional()
	@Field(() => FlightStatus, { nullable: true })
	flightStatus?: FlightStatus;
}

@InputType()
class FlightSearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	departureAirport?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	arrivalAirport?: string;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	departureDate?: Date;

	@IsOptional()
	@Field(() => FlightCabinClass, { nullable: true })
	cabinClass?: FlightCabinClass;

	@IsOptional()
	@Field(() => String, { nullable: true })
	airline?: string;

	@IsOptional()
	@Min(0)
	@Field(() => Int, { nullable: true })
	minPrice?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Int, { nullable: true })
	maxPrice?: number;
}

@InputType()
export class FlightsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableFlightSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => FlightSearch)
	search: FlightSearch;
}

@InputType()
class AllFlightsSearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	departureAirport?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	arrivalAirport?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	airline?: string;

	@IsOptional()
	@Field(() => FlightStatus, { nullable: true })
	flightStatus?: FlightStatus;

	@IsOptional()
	@Min(0)
	@Field(() => Int, { nullable: true })
	minPrice?: number;

	@IsOptional()
	@Min(0)
	@Field(() => Int, { nullable: true })
	maxPrice?: number;
}

@InputType()
export class AllFlightsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableFlightSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => AllFlightsSearch)
	search: AllFlightsSearch;
}
