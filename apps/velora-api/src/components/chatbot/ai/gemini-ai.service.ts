import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Content, FunctionDeclaration, GoogleGenAI, Schema, Type } from '@google/genai';
import {
	AiGenerateRequest,
	AiGenerateResponse,
	AiMessage,
	AiProvider,
	AiToolCall,
	AiToolDefinition,
	AiToolParameter,
} from './ai-provider.interface';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_TOKENS = 700;

/** Gemini implementation of AiProvider (Google AI Studio key, free tier friendly). */
@Injectable()
export class GeminiAiService implements AiProvider {
	private readonly logger = new Logger(GeminiAiService.name);
	private readonly client: GoogleGenAI | null;
	private readonly model: string;

	constructor(config: ConfigService) {
		const apiKey = config.get<string>('GEMINI_API_KEY')?.trim();
		this.model = config.get<string>('GEMINI_MODEL')?.trim() || DEFAULT_MODEL;
		this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
		if (!apiKey) this.logger.warn('GEMINI_API_KEY is not set — the assistant will answer from built-in FAQ only');
	}

	public get name(): string {
		return `gemini:${this.model}`;
	}

	public isEnabled(): boolean {
		return this.client !== null;
	}

	public async generate(request: AiGenerateRequest): Promise<AiGenerateResponse> {
		if (!this.client) throw new Error('Gemini provider is not configured');

		const response = await this.client.models.generateContent({
			model: this.model,
			contents: request.messages.map(toGeminiContent),
			config: {
				systemInstruction: request.systemPrompt,
				tools: request.tools.length ? [{ functionDeclarations: request.tools.map(toFunctionDeclaration) }] : undefined,
				temperature: 0.4,
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			},
		});

		// Read calls off the raw parts so each keeps its thought signature for the follow-up turn.
		const parts = response.candidates?.[0]?.content?.parts ?? [];
		const toolCalls: AiToolCall[] = parts.flatMap(({ functionCall: call, thoughtSignature }) =>
			call?.name ? [{ id: call.id, name: call.name, args: call.args ?? {}, signature: thoughtSignature }] : [],
		);

		return { text: toolCalls.length ? '' : (response.text ?? '').trim(), toolCalls };
	}
}

const toGeminiContent = (message: AiMessage): Content => {
	if (message.role === 'user') return { role: 'user', parts: [{ text: message.text }] };
	if (message.role === 'tool') {
		return {
			role: 'user',
			parts: message.results.map((result) => ({
				functionResponse: { id: result.id, name: result.name, response: result.output },
			})),
		};
	}
	if ('toolCalls' in message) {
		return {
			role: 'model',
			parts: message.toolCalls.map((call) => ({
				functionCall: { id: call.id, name: call.name, args: call.args },
				thoughtSignature: call.signature,
			})),
		};
	}
	return { role: 'model', parts: [{ text: message.text }] };
};

const toSchema = (param: AiToolParameter): Schema => {
	if (param.type === 'string') return { type: Type.STRING, description: param.description, enum: param.enum };
	return {
		type: param.type === 'integer' ? Type.INTEGER : Type.NUMBER,
		description: param.description,
		minimum: param.minimum,
		maximum: param.maximum,
	};
};

const toFunctionDeclaration = (tool: AiToolDefinition): FunctionDeclaration => ({
	name: tool.name,
	description: tool.description,
	parameters: {
		type: Type.OBJECT,
		properties: Object.fromEntries(
			Object.entries(tool.parameters.properties).map(([key, value]) => [key, toSchema(value)]),
		),
		required: tool.parameters.required,
	},
});
