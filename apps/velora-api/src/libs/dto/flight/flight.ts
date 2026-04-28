import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { FlightCabinClass, FlightStatus } from '../../enums/flight.enum';
import { MeLiked } from '../like/like';
import { TotalCounter } from '../member/member';

@ObjectType()
export class Flight {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => String)
	airline: string;

	@Field(() => String)
	flightNumber: string;

	@Field(() => String)
	departureAirport: string;

	@Field(() => String)
	arrivalAirport: string;

	@Field(() => Date)
	departureTime: Date;

	@Field(() => Date)
	arrivalTime: Date;

	@Field(() => FlightCabinClass)
	cabinClass: FlightCabinClass;

	@Field(() => Int)
	availableSeats: number;

	@Field(() => Number)
	basePrice: number;

	@Field(() => FlightStatus)
	flightStatus: FlightStatus;

	@Field(() => Int)
	flightLikes: number;

	@Field(() => Int)
	flightViews: number;

	@Field(() => Int)
	flightComments: number;

	@Field(() => Int)
	flightRank: number;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

@ObjectType()
export class Flights {
	@Field(() => [Flight])
	list: Flight[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
