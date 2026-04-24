import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
	TOUR = 'TOUR',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
