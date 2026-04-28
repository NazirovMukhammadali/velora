import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatbotReply {
	@Field(() => String)
	answer: string;

	@Field(() => String)
	category: string;
}
