import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [
				AppService,
				{
					provide: getConnectionToken(),
					useValue: { readyState: 1, db: { admin: () => ({ ping: () => Promise.resolve({ ok: 1 }) }) } },
				},
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	it('/ (GET)', () => {
		return request(app.getHttpServer()).get('/').expect(200).expect('Welcome to Velora API Server!');
	});

	it('/health (GET)', async () => {
		const res = await request(app.getHttpServer()).get('/health').expect(200);
		expect(res.body).toMatchObject({ status: 'ok', database: { status: 'up', state: 'connected' } });
	});
});
