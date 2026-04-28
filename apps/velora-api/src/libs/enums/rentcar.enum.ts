import { registerEnumType } from '@nestjs/graphql';

export enum RentcarStatus {
    ACTIVE = 'ACTIVE',
    CLOSED = 'CLOSED',
    DELETE = 'DELETE',
}
registerEnumType(RentcarStatus, {
    name: 'RentcarStatus',
});

export enum RentcarCategory {
    SEDAN = 'SEDAN',
    SUV = 'SUV',
    COUPE = 'COUPE',
    HATCHBACK = 'HATCHBACK',
    VAN = 'VAN',
    PICKUP = 'PICKUP',
}
registerEnumType(RentcarCategory, {
    name: 'RentcarCategory',
});

export enum TransmissionType {
    AUTOMATIC = 'AUTOMATIC',
    MANUAL = 'MANUAL',
}
registerEnumType(TransmissionType, {
    name: 'TransmissionType',
});
