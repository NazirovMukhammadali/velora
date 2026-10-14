import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	TOUR = 'TOUR',
	HOTEL = 'HOTEL',
	FLIGHT = 'FLIGHT',
	CAR = 'CAR',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
