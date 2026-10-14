import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ChatbotPromptInput } from '../../libs/dto/chatbot/chatbot.input';
import { ChatbotReply } from '../../libs/dto/chatbot/chatbot';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AssistantThrottlerGuard } from '../../libs/throttler/app-throttler.guard';
import { ChatbotService } from './chatbot.service';

@Resolver()
export class ChatbotResolver {
	constructor(private readonly chatbotService: ChatbotService) {}

	/**
	 * Open to guests; a valid Bearer token (verified by WithoutGuard) unlocks "my bookings".
	 * WithoutGuard runs first so the throttler can key signed-in users by member id
	 * (15 requests / minute, see THROTTLER_OPTIONS).
	 */
	@UseGuards(WithoutGuard, AssistantThrottlerGuard)
	@Mutation(() => ChatbotReply)
	public async askTravelAssistant(
		@Args('input') input: ChatbotPromptInput,
		@AuthMember('_id') memberId: Types.ObjectId | null,
	): Promise<ChatbotReply> {
		return this.chatbotService.ask(input.prompt, input.history ?? [], memberId ?? null);
	}
}
