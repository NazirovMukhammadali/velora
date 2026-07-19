import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import BookingSchema from '../../schemas/Booking.model';
import TourSchema from '../../schemas/Tour.model';
import HotelSchema from '../../schemas/Hotel.model';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { BookingsResolver } from './bookings.resolver';
import { BookingsService } from './bookings.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Booking', schema: BookingSchema },
			{ name: 'Tour', schema: TourSchema },
			{ name: 'Hotel', schema: HotelSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
	],
	providers: [BookingsResolver, BookingsService],
	exports: [BookingsService],
})
export class BookingsModule {}
