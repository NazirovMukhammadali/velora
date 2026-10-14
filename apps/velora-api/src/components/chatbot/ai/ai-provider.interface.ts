/**
 * Provider-neutral contract for the travel assistant. The chatbot service only talks to this
 * interface, so swapping Gemini for Claude / OpenAI means adding one class and changing the
 * AI_PROVIDER binding in ChatbotModule.
 */

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/** JSON-Schema subset every provider can express for tool parameters. */
export type AiToolParameter =
	| { type: 'string'; description?: string; enum?: string[] }
	| { type: 'integer' | 'number'; description?: string; minimum?: number; maximum?: number };

export type AiToolDefinition = {
	name: string;
	description: string;
	parameters: { type: 'object'; properties: Record<string, AiToolParameter>; required?: string[] };
};

export type AiToolCall = {
	/** Provider call id when it has one (echoed back with the result). */
	id?: string;
	name: string;
	args: Record<string, unknown>;
	/** Opaque provider token that must be echoed back with the call (Gemini 3 thought signature). */
	signature?: string;
};

export type AiToolResult = {
	id?: string;
	name: string;
	/** Already sanitised payload — never raw documents. */
	output: Record<string, unknown>;
};

export type AiMessage =
	| { role: 'user'; text: string }
	| { role: 'assistant'; text: string }
	| { role: 'assistant'; toolCalls: AiToolCall[] }
	| { role: 'tool'; results: AiToolResult[] };

export type AiGenerateRequest = {
	systemPrompt: string;
	messages: AiMessage[];
	tools: AiToolDefinition[];
};

export type AiGenerateResponse = {
	/** Final text when the model is done; empty while it still wants tools. */
	text: string;
	toolCalls: AiToolCall[];
};

export interface AiProvider {
	/** Human-readable provider/model id, e.g. "gemini:gemini-3.5-flash-lite". */
	readonly name: string;
	/** False when the provider is not configured (missing API key) — callers fall back. */
	isEnabled(): boolean;
	generate(request: AiGenerateRequest): Promise<AiGenerateResponse>;
}
