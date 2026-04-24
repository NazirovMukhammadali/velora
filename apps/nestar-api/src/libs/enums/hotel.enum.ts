import { registerEnumType } from '@nestjs/graphql';

export enum HotelStatus {
    ACTIVE = 'ACTIVE',
    CLOSED = 'CLOSED',
    DELETE = 'DELETE',
}
registerEnumType(HotelStatus, {
    name: 'HotelStatus',
});
