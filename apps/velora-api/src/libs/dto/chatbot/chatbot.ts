import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatbotSource {
	/** hotel | tour | rentcar | flight */
	@Field(() => String)
	type: string;

	@Field(() => String)
	title: string;

	/** Site-relative link to the item, e.g. /package/detail?type=hotels&id=… */
	@Field(() => String)
	url: string;

	@Field(() => Float)
	priceUsd: number;

	/** Cover image (absolute URL or API-relative upload path); null for flights. */
	@Field(() => String, { nullable: true })
	image?: string | null;
}

@ObjectType()
export class ChatbotReply {
	@Field(() => String)
	answer: string;

	/** "ai" for model answers, or the matched FAQ topic when the AI is unavailable. */
	@Field(() => String)
	category: string;

	/** Catalog items the answer was built from — render them as cards. */
	@Field(() => [ChatbotSource])
	sources: ChatbotSource[];

	@Field(() => Boolean)
	aiPowered: boolean;

	/** Short follow-up prompts the UI can offer as chips. */
	@Field(() => [String])
	suggestions: string[];
}
