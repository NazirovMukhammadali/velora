import { Args, Query, Resolver } from '@nestjs/graphql';
import { ChatbotPromptInput } from '../../libs/dto/chatbot/chatbot.input';
import { ChatbotReply } from '../../libs/dto/chatbot/chatbot';
import { ChatbotService } from './chatbot.service';

@Resolver()
export class ChatbotResolver {
	constructor(private readonly chatbotService: ChatbotService) {}

	@Query(() => ChatbotReply)
	public async askTravelAssistant(@Args('input') input: ChatbotPromptInput): Promise<ChatbotReply> {
		return this.chatbotService.ask(input.prompt);
	}
}
