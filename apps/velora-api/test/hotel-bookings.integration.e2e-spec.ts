import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import mongoose, { Model, Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { AuthModule } from '../src/components/auth/auth.module';
import { BookingsModule } from '../src/components/bookings/bookings.module';
import { BookingStatus } from '../src/libs/enums/booking.enum';
import { HotelStatus } from '../src/libs/enums/hotel.enum';
import { MemberAuthType, MemberStatus, MemberType } from '../src/libs/enums/member.enum';

const authMemberId = new Types.ObjectId('507f1f77bcf86cd799439041');
const authAdminId = new Types.ObjectId('507f1f77bcf86cd799439099');
const canRunMongoMemoryTests = process.platform !== 'darwin' || process.env.RUN_MONGO_MEMORY_TESTS === 'true';
const describeIntegration = canRunMongoMemoryTests ? describe : describe.skip;

jest.setTimeout(120000);

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

const tomorrowIso = () => {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
};

const dayAfterTomorrowIso = () => {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + 2);
	return d.toISOString().slice(0, 10);
};

describeIntegration('Hotel Bookings GraphQL (integration, mongo-memory)', () => {
	let app: INestApplication;
	let mongod: MongoMemoryReplSet;
	let mongoUri: string;
	let hotelModel: Model<any>;
	let bookingModel: Model<any>;
	let memberModel: Model<any>;

	beforeAll(async () => {
		process.env.SECRET_TOKEN = process.env.SECRET_TOKEN ?? 'integration-secret';
		const externalMongoUri = process.env.MONGO_TEST_URI;
		if (externalMongoUri) {
			mongoUri = externalMongoUri;
		} else {
			const downloadDir = resolve(process.cwd(), '.cache', 'mongodb-memory-server');
			mkdirSync(downloadDir, { recursive: true });
			process.env.MONGOMS_DOWNLOAD_DIR = downloadDir;
			const mongoBinaryVersion = process.env.MONGOMS_VERSION ?? '7.0.14';
			// Transactions require a replica set (standalone memory server rejects them).
			mongod = await MongoMemoryReplSet.create({
				binary: { version: mongoBinaryVersion },
				replSet: { count: 1, storageEngine: 'wiredTiger' },
			});
			mongoUri = mongod.getUri();
		}
	});

	afterAll(async () => {
		if (mongod) await mongod.stop();
		await mongoose.disconnect();
	});

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [
				MongooseModule.forRoot(mongoUri),
				GraphQLModule.forRoot<ApolloDriverConfig>({
					driver: ApolloDriver,
					autoSchemaFile: true,
				}),
				AuthModule,
				BookingsModule,
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		hotelModel = moduleFixture.get<Model<any>>(getModelToken('Hotel'));
		bookingModel = moduleFixture.get<Model<any>>(getModelToken('Booking'));
		memberModel = moduleFixture.get<Model<any>>(getModelToken('Member'));

		await hotelModel.deleteMany({});
		await bookingModel.deleteMany({});
		await memberModel.deleteMany({});

		await memberModel.create({
			_id: authAdminId,
			memberType: MemberType.ADMIN,
			memberStatus: MemberStatus.ACTIVE,
			memberAuthType: MemberAuthType.PHONE,
			memberPhone: '+998770000001',
			memberNick: 'velora_admin',
			memberPassword: 'hashed',
			memberFullName: 'Velora Admin',
		});
	});

	afterEach(async () => {
		if (app) await app.close();
	});

	it('creates, confirms, and cancels a hotel booking with room inventory', async () => {
		const hotelId = new Types.ObjectId('507f1f77bcf86cd799439071');
		await hotelModel.create({
			_id: hotelId,
			hotelName: 'Integration Hotel',
			hotelLocation: 'Marrakech',
			hotelAddress: '1 Medina St',
			hotelPrice: 120,
			hotelStars: 4,
			availableRooms: 4,
			hotelImages: ['https://example.com/hotel.png'],
			hotelStatus: HotelStatus.ACTIVE,
		});

		const checkIn = tomorrowIso();
		const checkOut = dayAfterTomorrowIso();

		const createMutation = `
          mutation {
            createHotelBooking(input: {
              hotelId: "${hotelId.toString()}"
              checkInDate: "${checkIn}"
              checkOutDate: "${checkOut}"
              quantity: 2
            }) {
              _id
              bookingType
              bookingStatus
              bookingPrice
              quantity
            }
          }
        `;

		const createResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: createMutation })
			.expect(200);

		expect(createResponse.body.errors).toBeUndefined();
		expect(createResponse.body.data.createHotelBooking.bookingStatus).toBe(BookingStatus.PENDING);
		expect(createResponse.body.data.createHotelBooking.bookingPrice).toBe(240);
		const createdBookingId = createResponse.body.data.createHotelBooking._id;

		const confirmMutation = `
          mutation {
            confirmHotelBookingByAdmin(input: { _id: "${createdBookingId}" }) {
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
		expect(confirmResponse.body.data.confirmHotelBookingByAdmin.bookingStatus).toBe(BookingStatus.CONFIRMED);

		const hotelAfterConfirm: any = await hotelModel.findById(hotelId).lean().exec();
		expect(hotelAfterConfirm?.availableRooms).toBe(2);

		const cancelMutation = `
          mutation {
            cancelHotelBookingByAdmin(input: { _id: "${createdBookingId}" }) {
              bookingStatus
            }
          }
        `;

		const cancelResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: cancelMutation })
			.expect(200);

		expect(cancelResponse.body.errors).toBeUndefined();
		expect(cancelResponse.body.data.cancelHotelBookingByAdmin.bookingStatus).toBe(BookingStatus.CANCELLED);

		const hotelAfterCancel: any = await hotelModel.findById(hotelId).lean().exec();
		expect(hotelAfterCancel?.availableRooms).toBe(4);
	});
});
