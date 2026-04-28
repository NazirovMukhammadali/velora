import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, Length } from 'class-validator';

@InputType()
export class ChatbotPromptInput {
	@IsNotEmpty()
	@Length(2, 500)
	@Field(() => String)
	prompt: string;
}
