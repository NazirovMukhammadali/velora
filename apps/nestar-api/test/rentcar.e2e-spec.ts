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

import { RentcarResolver } from '../src/components/rentcar/rentcar.resolver';
import { RentcarService } from '../src/components/rentcar/rentcar.service';
import { Direction } from '../src/libs/enums/common.enum';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../src/libs/enums/rentcar.enum';

describe('Rentcar GraphQL (e2e-lite)', () => {
    let app: INestApplication;

    const rentcarServiceMock = {
        getRentcars: jest.fn().mockResolvedValue({
            list: [
                {
                    _id: '507f1f77bcf86cd799439041',
                    carTitle: 'Velora SUV',
                    carLocation: 'Dubai',
                    carCategory: RentcarCategory.SUV,
                    transmission: TransmissionType.AUTOMATIC,
                    seats: 5,
                    dailyPrice: 120,
                    availableCars: 8,
                    carImages: ['https://example.com/rentcar.jpg'],
                    rentcarStatus: RentcarStatus.ACTIVE,
                    rentcarLikes: 0,
                    rentcarViews: 0,
                    rentcarComments: 0,
                    rentcarRank: 0,
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
                RentcarResolver,
                {
                    provide: RentcarService,
                    useValue: rentcarServiceMock,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('returns rentcars list from query', async () => {
        const query = `
          query {
            getRentcars(input: {
              page: 1,
              limit: 10,
              sort: "createdAt",
              direction: DESC,
              search: {}
            }) {
              list { carTitle carLocation }
              metaCounter { total }
            }
          }
        `;

        const response = await request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.getRentcars.list[0].carTitle).toBe('Velora SUV');
        expect(rentcarServiceMock.getRentcars).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            sort: 'createdAt',
            direction: Direction.DESC,
            search: {},
        });
    });
});
