import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import BookingSchema from '../../schemas/Booking.model';
import FlightSchema from '../../schemas/Flight.model';
import HotelSchema from '../../schemas/Hotel.model';
import RentcarSchema from '../../schemas/Rentcar.model';
import TourSchema from '../../schemas/Tour.model';
import { AuthModule } from '../auth/auth.module';
import { AI_PROVIDER } from './ai/ai-provider.interface';
import { GeminiAiService } from './ai/gemini-ai.service';
import { ChatbotResolver } from './chatbot.resolver';
import { ChatbotService } from './chatbot.service';
import { AssistantThrottlerGuard } from '../../libs/throttler/app-throttler.guard';
import { ChatbotToolsService } from './tools/chatbot-tools.service';

@Module({
	imports: [
		ConfigModule,
		AuthModule,
		MongooseModule.forFeature([
			{ name: 'Hotel', schema: HotelSchema },
			{ name: 'Tour', schema: TourSchema },
			{ name: 'Rentcar', schema: RentcarSchema },
			{ name: 'Flight', schema: FlightSchema },
			{ name: 'Booking', schema: BookingSchema },
		]),
	],
	providers: [
		ChatbotResolver,
		ChatbotService,
		ChatbotToolsService,
		AssistantThrottlerGuard,
		// Swap the provider here (e.g. ClaudeAiService) — nothing else depends on Gemini.
		{ provide: AI_PROVIDER, useClass: GeminiAiService },
	],
})
export class ChatbotModule {}
