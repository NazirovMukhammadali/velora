import { ThrottlerModuleOptions } from '@nestjs/throttler';

/** App-wide limit for every REST + GraphQL request, keyed per client. */
export const GLOBAL_THROTTLER = 'default';
/** Stricter limit for the AI assistant (each call costs a model request). */
export const ASSISTANT_THROTTLER = 'assistant';

export const THROTTLER_OPTIONS: ThrottlerModuleOptions = [
	{ name: GLOBAL_THROTTLER, ttl: 60_000, limit: 300 },
	{ name: ASSISTANT_THROTTLER, ttl: 60_000, limit: 15 },
];
