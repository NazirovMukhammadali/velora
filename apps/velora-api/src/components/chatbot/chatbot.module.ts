import { Module } from '@nestjs/common';
import { ChatbotResolver } from './chatbot.resolver';
import { ChatbotService } from './chatbot.service';

@Module({
	providers: [ChatbotResolver, ChatbotService],
})
export class ChatbotModule {}
