import { Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChatbotReply } from '../../libs/dto/chatbot/chatbot';
import { ChatbotTurnInput } from '../../libs/dto/chatbot/chatbot.input';
import { AI_PROVIDER, AiMessage, AiProvider, AiToolResult } from './ai/ai-provider.interface';
import { CHATBOT_TOOLS, ChatbotToolsService, ToolSource } from './tools/chatbot-tools.service';
import { fallbackReply } from './chatbot.fallback';
import { suggestionsFor } from './chatbot.suggestions';
import {
	HISTORY_MAX_TURNS,
	MAX_TOOL_CALLS_PER_ROUND,
	MAX_TOOL_ROUNDS,
	buildSystemPrompt,
	sanitizePrompt,
} from './chatbot.guardrails';

const MAX_SOURCES = 6;

/**
 * Orchestrates one assistant turn: guardrails → model → (validated tools → model)* → answer.
 * The model never touches the database; it can only request the whitelisted tools, and the
 * signed-in member id is injected from the JWT by the resolver.
 */
@Injectable()
export class ChatbotService {
	private readonly logger = new Logger(ChatbotService.name);

	constructor(
		@Inject(AI_PROVIDER) private readonly ai: AiProvider,
		private readonly tools: ChatbotToolsService,
	) {}

	public async ask(
		prompt: string,
		history: ChatbotTurnInput[] = [],
		memberId: Types.ObjectId | null = null,
	): Promise<ChatbotReply> {
		const question = sanitizePrompt(prompt);
		if (!question) return fallbackReply('');
		if (!this.ai.isEnabled()) return fallbackReply(question);

		const messages: AiMessage[] = [
			...history
				.slice(-HISTORY_MAX_TURNS)
				.map((turn) => ({ role: turn.role, text: sanitizePrompt(turn.text) }) as AiMessage)
				.filter((turn) => 'text' in turn && turn.text),
			{ role: 'user', text: question },
		];
		const systemPrompt = buildSystemPrompt(new Date(), Boolean(memberId));
		const sources: ToolSource[] = [];
		let usedBookings = false;

		try {
			for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
				// On the last round tools are withdrawn so the model must answer with what it has.
				const tools = round < MAX_TOOL_ROUNDS ? CHATBOT_TOOLS : [];
				const response = await this.ai.generate({ systemPrompt, messages, tools });

				if (!response.toolCalls.length) {
					const topics = [...new Set(sources.map((source) => source.type)), ...(usedBookings ? ['booking'] : [])];
					return {
						answer: response.text || "Sorry, I couldn't put an answer together. Please try rephrasing.",
						category: 'ai',
						sources: dedupe(sources).slice(0, MAX_SOURCES),
						aiPowered: true,
						suggestions: suggestionsFor(topics),
					};
				}

				const calls = response.toolCalls.slice(0, MAX_TOOL_CALLS_PER_ROUND);
				messages.push({ role: 'assistant', toolCalls: calls });
				const results: AiToolResult[] = [];
				for (const call of calls) {
					if (call.name === 'get_my_bookings') usedBookings = true;
					const execution = await this.tools.execute(call.name, call.args, { memberId });
					sources.push(...execution.sources);
					results.push({ id: call.id, name: call.name, output: execution.output });
				}
				messages.push({ role: 'tool', results });
			}
		} catch (err) {
			// Quota exhausted, timeout, network… degrade to the FAQ instead of surfacing provider errors.
			this.logger.warn(`AI provider ${this.ai.name} failed: ${(err as Error)?.message ?? err}`);
			return fallbackReply(question);
		}

		return fallbackReply(question);
	}
}

const dedupe = (items: ToolSource[]): ToolSource[] => {
	const seen = new Set<string>();
	return items.filter((item) => (seen.has(item.url) ? false : (seen.add(item.url), true)));
};
