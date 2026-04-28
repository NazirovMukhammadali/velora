import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { BookingsModule } from '../src/components/bookings/bookings.module';
import { BookingStatus } from '../src/libs/enums/booking.enum';
import { TourStatus } from '../src/libs/enums/tour.enum';

const authMemberId = new Types.ObjectId('507f1f77bcf86cd799439041');
const authAgentId = new Types.ObjectId('507f1f77bcf86cd799439051');
const describeIntegration = process.platform === 'darwin' ? describe.skip : describe;

jest.mock('../src/libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

jest.mock('../src/components/auth/guards/auth.guard', () => ({
	AuthGuard: class AuthGuard {
		canActivate(context: any) {
			const request = context.getArgByIndex(2).req;
			request.body.authMember = {
				_id: authMemberId,
				memberType: 'USER',
				memberStatus: 'ACTIVE',
				memberNick: 'integration-user',
			};
			return true;
		}
	},
}));

jest.mock('../src/components/auth/guards/roles.guard', () => ({
	RolesGuard: class RolesGuard {
		canActivate() {
			return true;
		}
	},
}));

describeIntegration('Bookings GraphQL (integration, mongo-memory)', () => {
	let app: INestApplication;
	let mongod: MongoMemoryServer;
	let mongoUri: string;
	let tourModel: Model<any>;
	let bookingModel: Model<any>;

	beforeAll(async () => {
		process.env.SECRET_TOKEN = process.env.SECRET_TOKEN ?? 'integration-secret';
		const downloadDir = resolve(process.cwd(), '.cache', 'mongodb-memory-server');
		mkdirSync(downloadDir, { recursive: true });
		process.env.MONGOMS_DOWNLOAD_DIR = downloadDir;
		mongod = await MongoMemoryServer.create();
		mongoUri = mongod.getUri();
	});

	afterAll(async () => {
		if (mongod) await mongod.stop();
	});

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [
				MongooseModule.forRoot(mongoUri),
				GraphQLModule.forRoot<ApolloDriverConfig>({
					driver: ApolloDriver,
					autoSchemaFile: true,
				}),
				BookingsModule,
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		tourModel = moduleFixture.get<Model<any>>(getModelToken('Tour'));
		bookingModel = moduleFixture.get<Model<any>>(getModelToken('Booking'));

		await tourModel.deleteMany({});
		await bookingModel.deleteMany({});
	});

	afterEach(async () => {
		if (app) await app.close();
	});

	it('creates pending tour booking and allows admin confirmation', async () => {
		const seededTourId = new Types.ObjectId('507f1f77bcf86cd799439031');
		await tourModel.create({
			_id: seededTourId,
			tourTitle: 'Integration Tour',
			tourLocation: 'Seoul',
			tourDays: 3,
			tourNights: 2,
			tourPrice: 320,
			tourImages: ['https://example.com/tour.png'],
			tourStatus: TourStatus.ACTIVE,
			memberId: authAgentId,
		});

		const createMutation = `
          mutation {
            createTourBooking(input: { tourId: "${seededTourId.toString()}" }) {
              _id
              bookingType
              bookingStatus
              bookingRefId
            }
          }
        `;

		const createResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: createMutation })
			.expect(200);

		expect(createResponse.body.errors).toBeUndefined();
		expect(createResponse.body.data.createTourBooking.bookingStatus).toBe(BookingStatus.PENDING);
		const createdBookingId = createResponse.body.data.createTourBooking._id;

		const confirmMutation = `
          mutation {
            confirmTourBookingByAdmin(input: { _id: "${createdBookingId}" }) {
              bookingStatus
            }
          }
        `;

		const confirmResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: confirmMutation })
			.expect(200);

		expect(confirmResponse.body.errors).toBeUndefined();
		expect(confirmResponse.body.data.confirmTourBookingByAdmin.bookingStatus).toBe(BookingStatus.CONFIRMED);
	});
});
