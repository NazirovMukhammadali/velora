import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
	MaxLength,
	ValidateNested,
} from 'class-validator';

/** Max characters per user message (token-exhaustion / DoS guard). */
export const PROMPT_MAX_LENGTH = 1000;
/** Max previous turns a client may send back. */
export const HISTORY_MAX_TURNS = 8;

@InputType()
export class ChatbotTurnInput {
	@IsIn(['user', 'assistant'])
	@Field(() => String)
	role: 'user' | 'assistant';

	@IsString()
	@MaxLength(PROMPT_MAX_LENGTH)
	@Field(() => String)
	text: string;
}

@InputType()
export class ChatbotPromptInput {
	@IsNotEmpty()
	@IsString()
	@Length(2, PROMPT_MAX_LENGTH)
	@Field(() => String)
	prompt: string;

	/** Previous turns of this conversation (client-held; the server is stateless). */
	@IsOptional()
	@ArrayMaxSize(HISTORY_MAX_TURNS)
	@ValidateNested({ each: true })
	@Type(() => ChatbotTurnInput)
	@Field(() => [ChatbotTurnInput], { nullable: true })
	history?: ChatbotTurnInput[];
}
