import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	PROPERTY = 'PROPERTY',
	ARTICLE = 'ARTICLE',
	TOUR = 'TOUR',
	HOTEL = 'HOTEL',
	FLIGHT = 'FLIGHT',
	CAR = 'CAR',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
