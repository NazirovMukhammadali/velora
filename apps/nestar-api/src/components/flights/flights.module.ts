import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import FlightSchema from '../../schemas/Flight.model';
import { FlightsResolver } from './flights.resolver';
import { FlightsService } from './flights.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Flight', schema: FlightSchema }]),
    ],
    providers: [FlightsResolver, FlightsService],
})
export class FlightsModule {}
