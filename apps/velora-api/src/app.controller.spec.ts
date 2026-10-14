import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const buildController = async (connection: Record<string, unknown>) => {
	const moduleRef = await Test.createTestingModule({
		controllers: [AppController],
		providers: [AppService, { provide: getConnectionToken(), useValue: connection }],
	}).compile();
	return moduleRef.get(AppController);
};

const dbWithPing = (ping: () => Promise<unknown>) => ({ admin: () => ({ ping }) });

describe('AppController /health', () => {
	it('reports ok when MongoDB answers a ping', async () => {
		const controller = await buildController({ readyState: 1, db: dbWithPing(() => Promise.resolve({ ok: 1 })) });
		const health = await controller.getHealth();
		expect(health.status).toBe('ok');
		expect(health.database).toEqual({ status: 'up', state: 'connected' });
		expect(typeof health.uptime).toBe('number');
	});

	it('returns 503 when the connection is down', async () => {
		const ping = jest.fn();
		const controller = await buildController({ readyState: 0, db: dbWithPing(ping) });
		const error = await controller.getHealth().catch((err) => err);
		expect(error).toBeInstanceOf(ServiceUnavailableException);
		expect(error.getResponse()).toMatchObject({ status: 'error', database: { status: 'down', state: 'disconnected' } });
		expect(ping).not.toHaveBeenCalled();
	});

	it('returns 503 when the ping fails even though readyState says connected', async () => {
		const controller = await buildController({
			readyState: 1,
			db: dbWithPing(() => Promise.reject(new Error('socket closed'))),
		});
		await expect(controller.getHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
	});
});
