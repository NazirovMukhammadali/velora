import { registerEnumType } from '@nestjs/graphql';

export enum TourStatus {
	ACTIVE = 'ACTIVE',
	CLOSED = 'CLOSED',
	DELETE = 'DELETE',
}
registerEnumType(TourStatus, {
	name: 'TourStatus',
});
