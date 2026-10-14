import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { AppThrottlerGuard, AssistantThrottlerGuard } from './app-throttler.guard';
import { THROTTLER_OPTIONS } from './throttler.config';

const httpContext = (req: Record<string, unknown>): ExecutionContext => {
	const res = { header: jest.fn(), setHeader: jest.fn() };
	const handler = function handler() {};
	class Target {}
	return {
		getType: () => 'http',
		getHandler: () => handler,
		getClass: () => Target,
		switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
	} as unknown as ExecutionContext;
};

const build = async <T extends AppThrottlerGuard | AssistantThrottlerGuard>(
	Guard: new (...args: any[]) => T,
	storage: ThrottlerStorageService,
): Promise<T> => {
	const guard = new Guard(THROTTLER_OPTIONS, storage, new Reflector());
	await guard.onModuleInit();
	return guard;
};

describe('scoped throttler guards', () => {
	it('the global guard only counts the default throttler (300/min)', async () => {
		const storage = new ThrottlerStorageService();
		const guard = await build(AppThrottlerGuard, storage);
		const ctx = httpContext({ ip: '10.0.0.1', headers: {} });
		for (let i = 0; i < 20; i++) await expect(guard.canActivate(ctx)).resolves.toBe(true);
		storage.onApplicationShutdown();
	});

	it('the assistant guard blocks the 16th call in a minute for the same member', async () => {
		const storage = new ThrottlerStorageService();
		const guard = await build(AssistantThrottlerGuard, storage);
		const ctx = httpContext({ ip: '10.0.0.2', headers: {}, body: { authMember: { _id: 'm1' } } });
		for (let i = 0; i < 15; i++) await expect(guard.canActivate(ctx)).resolves.toBe(true);
		await expect(guard.canActivate(ctx)).rejects.toThrow();
		// A different member on the same IP is unaffected.
		const other = httpContext({ ip: '10.0.0.2', headers: {}, body: { authMember: { _id: 'm2' } } });
		await expect(guard.canActivate(other)).resolves.toBe(true);
		storage.onApplicationShutdown();
	});
});
