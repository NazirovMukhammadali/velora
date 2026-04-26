import { registerEnumType } from '@nestjs/graphql';

export enum BookingType {
    FLIGHT = 'FLIGHT',
    HOTEL = 'HOTEL',
    TOUR = 'TOUR',
    CAR = 'CAR',
}
registerEnumType(BookingType, {
    name: 'BookingType',
});

export enum BookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}
registerEnumType(BookingStatus, {
    name: 'BookingStatus',
});
