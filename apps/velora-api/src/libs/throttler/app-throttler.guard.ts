import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard, ThrottlerLimitDetail, ThrottlerRequest } from '@nestjs/throttler';
import { GraphQLError } from 'graphql';
import { ASSISTANT_THROTTLER, GLOBAL_THROTTLER } from './throttler.config';

const isGraphql = (context: ExecutionContext): boolean => context.getType<GqlContextType>() === 'graphql';

/**
 * ThrottlerGuard that works for both REST and GraphQL and only enforces one named throttler,
 * so the global guard and the assistant guard never count the same request twice.
 * Signed-in callers are limited per member id (sharing a network does not throttle everyone);
 * guests are limited per client IP.
 */
abstract class ScopedThrottlerGuard extends ThrottlerGuard {
	protected abstract readonly scope: string;

	/** Only HTTP and GraphQL requests are throttled here (any other transport needs its own limits). */
	protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
		return context.getType() !== 'http' && !isGraphql(context);
	}

	protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
		if (requestProps.throttler.name !== this.scope) return true;
		return super.handleRequest(requestProps);
	}

	protected getRequestResponse(context: ExecutionContext) {
		if (!isGraphql(context)) return super.getRequestResponse(context);
		const gqlCtx = GqlExecutionContext.create(context).getContext();
		const req = gqlCtx.req;
		// Apollo/express does not always hand the response to the GraphQL context; give the guard a no-op header sink.
		const res = gqlCtx.res ?? req?.res ?? { header: () => undefined, setHeader: () => undefined };
		return { req, res };
	}

	protected async getTracker(req: Record<string, any>): Promise<string> {
		const memberId = req?.body?.authMember?._id;
		if (memberId) return `member:${String(memberId)}`;
		// Raw X-Forwarded-For is client-controlled; req.ip honours Express "trust proxy" when deployed behind one.
		return `ip:${req?.ip || req?.socket?.remoteAddress || 'unknown'}`;
	}

	/** Clear, client-actionable GraphQL error instead of a generic INTERNAL_SERVER_ERROR. */
	protected async throwThrottlingException(context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
		if (!isGraphql(context)) return super.throwThrottlingException(context, detail);
		throw new GraphQLError('Too many requests. Please wait a minute and try again.', {
			extensions: { code: 'TOO_MANY_REQUESTS' },
		});
	}
}

/** Registered as APP_GUARD: the app-wide request limit. */
@Injectable()
export class AppThrottlerGuard extends ScopedThrottlerGuard {
	protected readonly scope = GLOBAL_THROTTLER;
}

/** Per-resolver guard for the AI assistant; put it after the auth guard so members are keyed by id. */
@Injectable()
export class AssistantThrottlerGuard extends ScopedThrottlerGuard {
	protected readonly scope = ASSISTANT_THROTTLER;
}
