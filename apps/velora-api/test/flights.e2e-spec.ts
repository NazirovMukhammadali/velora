import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import request from 'supertest';

jest.mock('../src/libs/config', () => ({
    shapeIntoMongoObjectId: jest.fn((value) => value),
}));
jest.mock('../src/components/auth/guards/auth.guard', () => ({
    AuthGuard: class AuthGuard { },
}));
jest.mock('../src/components/auth/guards/roles.guard', () => ({
    RolesGuard: class RolesGuard { },
}));
jest.mock('../src/components/auth/guards/without.guard', () => ({
    WithoutGuard: class WithoutGuard { },
}));
jest.mock('../src/components/auth/decorators/authMember.decorator', () => ({
    AuthMember: () => () => ({}),
}));
jest.mock('../src/components/auth/decorators/roles.decorator', () => ({
    Roles: () => () => ({}),
}));

import { FlightsResolver } from '../src/components/flights/flights.resolver';
import { FlightsService } from '../src/components/flights/flights.service';
import { Direction } from '../src/libs/enums/common.enum';
import { FlightCabinClass, FlightStatus } from '../src/libs/enums/flight.enum';

describe('Flights GraphQL (e2e-lite)', () => {
    let app: INestApplication;

    const flightsServiceMock = {
        getFlights: jest.fn().mockResolvedValue({
            list: [
                {
                    _id: '507f1f77bcf86cd799439031',
                    airline: 'Velora Air',
                    flightNumber: 'VL100',
                    departureAirport: 'TAS',
                    arrivalAirport: 'DXB',
                    departureTime: new Date(),
                    arrivalTime: new Date(),
                    cabinClass: FlightCabinClass.ECONOMY,
                    availableSeats: 20,
                    basePrice: 220,
                    flightStatus: FlightStatus.ACTIVE,
                    flightLikes: 0,
                    flightViews: 0,
                    flightComments: 0,
                    flightRank: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            metaCounter: [{ total: 1 }],
        }),
    };

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                GraphQLModule.forRoot<ApolloDriverConfig>({
                    driver: ApolloDriver,
                    autoSchemaFile: true,
                }),
            ],
            providers: [
                FlightsResolver,
                {
                    provide: FlightsService,
                    useValue: flightsServiceMock,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('returns flights list from query', async () => {
        const query = `
          query {
            getFlights(input: {
              page: 1,
              limit: 10,
              sort: "departureTime",
              direction: ASC,
              search: {}
            }) {
              list { airline flightNumber }
              metaCounter { total }
            }
          }
        `;

        const response = await request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.getFlights.list[0].airline).toBe('Velora Air');
        expect(flightsServiceMock.getFlights).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            sort: 'departureTime',
            direction: Direction.ASC,
            search: {},
        });
    });
});
