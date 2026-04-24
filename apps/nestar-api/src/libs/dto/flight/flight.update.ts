import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Types } from 'mongoose';
import { FlightCabinClass, FlightStatus } from '../../enums/flight.enum';

@InputType()
export class FlightUpdate {
    @IsNotEmpty()
    @Field(() => String)
    _id: Types.ObjectId;

    @IsOptional()
    @Field(() => String, { nullable: true })
    airline?: string;

    @IsOptional()
    @Field(() => String, { nullable: true })
    flightNumber?: string;

    @IsOptional()
    @Field(() => String, { nullable: true })
    departureAirport?: string;

    @IsOptional()
    @Field(() => String, { nullable: true })
    arrivalAirport?: string;

    @IsOptional()
    @Field(() => Date, { nullable: true })
    departureTime?: Date;

    @IsOptional()
    @Field(() => Date, { nullable: true })
    arrivalTime?: Date;

    @IsOptional()
    @Field(() => FlightCabinClass, { nullable: true })
    cabinClass?: FlightCabinClass;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    availableSeats?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    basePrice?: number;

    @IsOptional()
    @Field(() => FlightStatus, { nullable: true })
    flightStatus?: FlightStatus;
}
