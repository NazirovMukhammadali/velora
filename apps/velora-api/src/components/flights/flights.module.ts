import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeModule } from '../like/like.module';
import { ViewModule } from '../view/view.module';
import { AuthModule } from '../auth/auth.module';
import FlightSchema from '../../schemas/Flight.model';
import { FlightsResolver } from './flights.resolver';
import { FlightsService } from './flights.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Flight', schema: FlightSchema }]),
        LikeModule,
        ViewModule,
        AuthModule,
    ],
    providers: [FlightsResolver, FlightsService],
})
export class FlightsModule {}
