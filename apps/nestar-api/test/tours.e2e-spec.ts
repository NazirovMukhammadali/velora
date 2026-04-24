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
import { ToursResolver } from '../src/components/tours/tours.resolver';
import { ToursService } from '../src/components/tours/tours.service';
import { Direction } from '../src/libs/enums/common.enum';
import { TourStatus } from '../src/libs/enums/tour.enum';

describe('Tours GraphQL (e2e-lite)', () => {
    let app: INestApplication;

    const toursServiceMock = {
        getTours: jest.fn().mockResolvedValue({
            list: [
                {
                    _id: '507f1f77bcf86cd799439011',
                    tourTitle: 'Paris Art Tour',
                    tourLocation: 'Paris',
                    tourDays: 5,
                    tourNights: 4,
                    tourPrice: 1200,
                    tourImages: ['https://example.com/paris.jpg'],
                    tourStatus: TourStatus.ACTIVE,
                    tourLikes: 2,
                    tourViews: 10,
                    tourComments: 0,
                    tourRank: 0,
                    memberId: '507f1f77bcf86cd799439012',
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
                ToursResolver,
                {
                    provide: ToursService,
                    useValue: toursServiceMock,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('returns tours list from query', async () => {
        const query = `
          query {
            getTours(input: {
              page: 1,
              limit: 10,
              sort: "createdAt",
              direction: DESC,
              search: {}
            }) {
              list { tourTitle tourLocation }
              metaCounter { total }
            }
          }
        `;

        const response = await request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.getTours.list[0].tourTitle).toBe('Paris Art Tour');
        expect(toursServiceMock.getTours).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            sort: 'createdAt',
            direction: Direction.DESC,
            search: {},
        });
    });
});
