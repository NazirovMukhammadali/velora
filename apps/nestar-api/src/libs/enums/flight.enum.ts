import { registerEnumType } from '@nestjs/graphql';

export enum FlightStatus {
    ACTIVE = 'ACTIVE',
    CANCELLED = 'CANCELLED',
}
registerEnumType(FlightStatus, {
    name: 'FlightStatus',
});

export enum FlightCabinClass {
    ECONOMY = 'ECONOMY',
    PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
    BUSINESS = 'BUSINESS',
    FIRST = 'FIRST',
}
registerEnumType(FlightCabinClass, {
    name: 'FlightCabinClass',
});
