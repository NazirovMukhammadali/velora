import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
	HOTEL = 'HOTEL',
	FLIGHT = 'FLIGHT',
	RENTCAR = 'RENTCAR',
	TOUR = 'TOUR',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
