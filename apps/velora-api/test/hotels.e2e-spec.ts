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

import { HotelsResolver } from '../src/components/hotels/hotels.resolver';
import { HotelsService } from '../src/components/hotels/hotels.service';
import { Direction } from '../src/libs/enums/common.enum';
import { HotelStatus } from '../src/libs/enums/hotel.enum';

describe('Hotels GraphQL (e2e-lite)', () => {
    let app: INestApplication;

    const hotelsServiceMock = {
        getHotels: jest.fn().mockResolvedValue({
            list: [
                {
                    _id: '507f1f77bcf86cd799439021',
                    hotelName: 'Velora Marina',
                    hotelLocation: 'Dubai',
                    hotelAddress: 'Dubai Marina',
                    hotelPrice: 260,
                    hotelStars: 5,
                    availableRooms: 20,
                    hotelImages: ['https://example.com/hotel.jpg'],
                    hotelStatus: HotelStatus.ACTIVE,
                    hotelLikes: 3,
                    hotelViews: 14,
                    hotelComments: 0,
                    hotelRank: 0,
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
                HotelsResolver,
                {
                    provide: HotelsService,
                    useValue: hotelsServiceMock,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('returns hotels list from query', async () => {
        const query = `
          query {
            getHotels(input: {
              page: 1,
              limit: 10,
              sort: "createdAt",
              direction: DESC,
              search: {}
            }) {
              list { hotelName hotelLocation }
              metaCounter { total }
            }
          }
        `;

        const response = await request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.getHotels.list[0].hotelName).toBe('Velora Marina');
        expect(hotelsServiceMock.getHotels).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            sort: 'createdAt',
            direction: Direction.DESC,
            search: {},
        });
    });
});
