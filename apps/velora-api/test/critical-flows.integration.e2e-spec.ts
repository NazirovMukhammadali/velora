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
import { BookingStatus } from '../src/libs/enums/booking.enum';
import { MemberAuthType, MemberStatus, MemberType } from '../src/libs/enums/member.enum';
import { TourStatus } from '../src/libs/enums/tour.enum';
import { FlightCabinClass, FlightStatus } from '../src/libs/enums/flight.enum';
import { CommentModule } from '../src/components/comment/comment.module';
import { FlightsModule } from '../src/components/flights/flights.module';

const authMemberId = new Types.ObjectId('507f1f77bcf86cd799439041');
const authAgentId = new Types.ObjectId('507f1f77bcf86cd799439051');
const canRunMongoMemoryTests = process.platform !== 'darwin' || process.env.RUN_MONGO_MEMORY_TESTS === 'true';
const describeIntegration = canRunMongoMemoryTests ? describe : describe.skip;

jest.mock('../src/libs/config', () => ({
	shapeIntoMongoObjectId: jest.fn((value) => value),
}));

jest.mock('../src/components/auth/guards/auth.guard', () => ({
	AuthGuard: class AuthGuard {
		canActivate(context: any) {
			const req = context.getArgByIndex(2).req;
			req.body.authMember = {
				_id: authMemberId,
				memberType: MemberType.USER,
				memberStatus: MemberStatus.ACTIVE,
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

describeIntegration('Critical flows (integration, mongo-memory)', () => {
	let app: INestApplication;
	let mongod: MongoMemoryServer;
	let mongoUri: string;
	let memberModel: Model<any>;
	let tourModel: Model<any>;
	let bookingModel: Model<any>;
	let commentModel: Model<any>;
	let flightModel: Model<any>;

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
				CommentModule,
				FlightsModule,
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		memberModel = moduleFixture.get<Model<any>>(getModelToken('Member'));
		tourModel = moduleFixture.get<Model<any>>(getModelToken('Tour'));
		bookingModel = moduleFixture.get<Model<any>>(getModelToken('Booking'));
		commentModel = moduleFixture.get<Model<any>>(getModelToken('Comment'));
		flightModel = moduleFixture.get<Model<any>>(getModelToken('Flight'));

		await memberModel.deleteMany({});
		await tourModel.deleteMany({});
		await bookingModel.deleteMany({});
		await commentModel.deleteMany({});
		await flightModel.deleteMany({});
	});

	afterEach(async () => {
		if (app) await app.close();
	});

	it('enforces review gating: comment allowed only after confirmed booking', async () => {
		await memberModel.create([
			{
				_id: authMemberId,
				memberType: MemberType.USER,
				memberStatus: MemberStatus.ACTIVE,
				memberAuthType: MemberAuthType.PHONE,
				memberPhone: '+10000000001',
				memberNick: 'integration-user',
				memberPassword: 'hashed-password',
			},
			{
				_id: authAgentId,
				memberType: MemberType.AGENT,
				memberStatus: MemberStatus.ACTIVE,
				memberAuthType: MemberAuthType.PHONE,
				memberPhone: '+10000000002',
				memberNick: 'integration-agent',
				memberPassword: 'hashed-password',
			},
		]);

		const seededTourId = new Types.ObjectId('507f1f77bcf86cd799439031');
		await tourModel.create({
			_id: seededTourId,
			tourTitle: 'Critical Flow Tour',
			tourLocation: 'Tokyo',
			tourDays: 4,
			tourNights: 3,
			tourPrice: 500,
			tourImages: ['https://example.com/tour.png'],
			tourStatus: TourStatus.ACTIVE,
			memberId: authAgentId,
		});

		const rejectedCommentMutation = `
          mutation {
            createComment(input: {
              commentGroup: MEMBER,
              commentContent: "No confirmed booking yet",
              commentRating: 4,
              commentRefId: "${authAgentId.toString()}"
            }) {
              _id
            }
          }
        `;

		const rejectedResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: rejectedCommentMutation })
			.expect(200);
		expect(rejectedResponse.body.errors?.length).toBeGreaterThan(0);

		const createBookingMutation = `
          mutation {
            createTourBooking(input: { tourId: "${seededTourId.toString()}" }) {
              _id
            }
          }
        `;
		const createBookingResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: createBookingMutation })
			.expect(200);
		const bookingId = createBookingResponse.body.data.createTourBooking._id;

		const confirmMutation = `
          mutation {
            confirmTourBookingByAdmin(input: { _id: "${bookingId}" }) {
              bookingStatus
            }
          }
        `;
		const confirmResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: confirmMutation })
			.expect(200);
		expect(confirmResponse.body.data.confirmTourBookingByAdmin.bookingStatus).toBe(BookingStatus.CONFIRMED);

		const allowedCommentMutation = `
          mutation {
            createComment(input: {
              commentGroup: MEMBER,
              commentContent: "Confirmed booking review",
              commentRating: 5,
              commentRefId: "${authAgentId.toString()}"
            }) {
              _id
              commentContent
            }
          }
        `;
		const allowedResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: allowedCommentMutation })
			.expect(200);
		expect(allowedResponse.body.errors).toBeUndefined();
		expect(allowedResponse.body.data.createComment.commentContent).toBe('Confirmed booking review');
	});

	it('supports flight detail and like mutation with persisted counter', async () => {
		const seededFlightId = new Types.ObjectId('507f1f77bcf86cd799439032');
		await flightModel.create({
			_id: seededFlightId,
			airline: 'Velora Air',
			flightNumber: 'VL-700',
			departureAirport: 'ICN',
			arrivalAirport: 'NRT',
			departureTime: new Date('2030-01-01T02:00:00.000Z'),
			arrivalTime: new Date('2030-01-01T05:00:00.000Z'),
			cabinClass: FlightCabinClass.ECONOMY,
			basePrice: 320,
			flightStatus: FlightStatus.ACTIVE,
			flightLikes: 0,
		});

		const detailQuery = `
          query {
            getFlightDetail(flightId: "${seededFlightId.toString()}") {
              _id
              flightNumber
            }
          }
        `;
		const detailResponse = await request(app.getHttpServer())
			.post('/graphql')
			.send({ query: detailQuery })
			.expect(200);
		expect(detailResponse.body.errors).toBeUndefined();
		expect(detailResponse.body.data.getFlightDetail.flightNumber).toBe('VL-700');

		const likeMutation = `
          mutation {
            likeTargetFlight(flightId: "${seededFlightId.toString()}") {
              _id
              flightLikes
            }
          }
        `;
		const likeResponse = await request(app.getHttpServer())
			.post('/graphql')
			.set('authorization', 'Bearer integration-token')
			.send({ query: likeMutation })
			.expect(200);
		expect(likeResponse.body.errors).toBeUndefined();
		expect(likeResponse.body.data.likeTargetFlight.flightLikes).toBe(1);
	});
});
