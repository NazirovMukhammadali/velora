import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import FlightSchema from '../../velora-api/src/schemas/Flight.model';
import HotelSchema from '../../velora-api/src/schemas/Hotel.model';
import MemberSchema from '../../velora-api/src/schemas/Member.model';
import RentcarSchema from '../../velora-api/src/schemas/Rentcar.model';
import TourSchema from '../../velora-api/src/schemas/Tour.model';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule,
		ScheduleModule.forRoot(),
		MongooseModule.forFeature([
			{ name: 'Hotel', schema: HotelSchema },
			{ name: 'Tour', schema: TourSchema },
			{ name: 'Rentcar', schema: RentcarSchema },
			{ name: 'Flight', schema: FlightSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
	],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
