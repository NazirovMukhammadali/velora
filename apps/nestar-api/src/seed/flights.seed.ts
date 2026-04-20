import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import FlightSchema from '../schemas/Flight.model';
import { FlightCabinClass, FlightStatus } from '../libs/enums/flight.enum';

type SeedFlight = {
    airline: string;
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime: Date;
    arrivalTime: Date;
    cabinClass: FlightCabinClass;
    availableSeats: number;
    basePrice: number;
    flightStatus: FlightStatus;
};

const loadLocalEnv = (): void => {
    const envPath = resolve(process.cwd(), '.env');
    if (!existsSync(envPath)) return;

    const envFile = readFileSync(envPath, 'utf8');
    for (const line of envFile.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex < 0) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (!key || process.env[key] !== undefined) continue;
        process.env[key] = value;
    }
};

const resolveMongoUri = (): string => {
    loadLocalEnv();
    const isProduction = process.env.NODE_ENV === 'production';
    const uri = isProduction ? process.env.MONGO_PROD : process.env.MONGO_DEV;

    if (!uri) {
        const expectedKey = isProduction ? 'MONGO_PROD' : 'MONGO_DEV';
        throw new Error(`MongoDB URI is missing. Please set ${expectedKey} in .env`);
    }

    return uri;
};

const addHours = (from: Date, hours: number): Date => new Date(from.getTime() + hours * 60 * 60 * 1000);

const buildSeedFlights = (): SeedFlight[] => {
    const now = new Date();
    const base1 = addHours(now, 24);
    const base2 = addHours(now, 32);
    const base3 = addHours(now, 40);
    const base4 = addHours(now, 48);

    return [
        {
            airline: 'Uzbekistan Airways',
            flightNumber: 'VLR1001',
            departureAirport: 'TAS',
            arrivalAirport: 'IST',
            departureTime: base1,
            arrivalTime: addHours(base1, 5),
            cabinClass: FlightCabinClass.ECONOMY,
            availableSeats: 32,
            basePrice: 340,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Uzbekistan Airways',
            flightNumber: 'VLR1002',
            departureAirport: 'TAS',
            arrivalAirport: 'DXB',
            departureTime: base2,
            arrivalTime: addHours(base2, 3),
            cabinClass: FlightCabinClass.BUSINESS,
            availableSeats: 18,
            basePrice: 520,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Turkish Airlines',
            flightNumber: 'VLR1003',
            departureAirport: 'IST',
            arrivalAirport: 'LHR',
            departureTime: base1,
            arrivalTime: addHours(base1, 4),
            cabinClass: FlightCabinClass.PREMIUM_ECONOMY,
            availableSeats: 24,
            basePrice: 410,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Emirates',
            flightNumber: 'VLR1004',
            departureAirport: 'DXB',
            arrivalAirport: 'SIN',
            departureTime: base3,
            arrivalTime: addHours(base3, 7),
            cabinClass: FlightCabinClass.ECONOMY,
            availableSeats: 40,
            basePrice: 460,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Qatar Airways',
            flightNumber: 'VLR1005',
            departureAirport: 'DOH',
            arrivalAirport: 'CDG',
            departureTime: base2,
            arrivalTime: addHours(base2, 6),
            cabinClass: FlightCabinClass.BUSINESS,
            availableSeats: 20,
            basePrice: 690,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Lufthansa',
            flightNumber: 'VLR1006',
            departureAirport: 'FRA',
            arrivalAirport: 'JFK',
            departureTime: base4,
            arrivalTime: addHours(base4, 8),
            cabinClass: FlightCabinClass.FIRST,
            availableSeats: 8,
            basePrice: 1220,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'British Airways',
            flightNumber: 'VLR1007',
            departureAirport: 'LHR',
            arrivalAirport: 'JFK',
            departureTime: base3,
            arrivalTime: addHours(base3, 8),
            cabinClass: FlightCabinClass.ECONOMY,
            availableSeats: 45,
            basePrice: 590,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Air France',
            flightNumber: 'VLR1008',
            departureAirport: 'CDG',
            arrivalAirport: 'FCO',
            departureTime: base1,
            arrivalTime: addHours(base1, 2),
            cabinClass: FlightCabinClass.ECONOMY,
            availableSeats: 36,
            basePrice: 210,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Korean Air',
            flightNumber: 'VLR1009',
            departureAirport: 'ICN',
            arrivalAirport: 'NRT',
            departureTime: base2,
            arrivalTime: addHours(base2, 2),
            cabinClass: FlightCabinClass.PREMIUM_ECONOMY,
            availableSeats: 28,
            basePrice: 260,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Singapore Airlines',
            flightNumber: 'VLR1010',
            departureAirport: 'SIN',
            arrivalAirport: 'SYD',
            departureTime: base4,
            arrivalTime: addHours(base4, 8),
            cabinClass: FlightCabinClass.BUSINESS,
            availableSeats: 16,
            basePrice: 910,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Japan Airlines',
            flightNumber: 'VLR1011',
            departureAirport: 'NRT',
            arrivalAirport: 'SFO',
            departureTime: base3,
            arrivalTime: addHours(base3, 10),
            cabinClass: FlightCabinClass.ECONOMY,
            availableSeats: 34,
            basePrice: 640,
            flightStatus: FlightStatus.ACTIVE,
        },
        {
            airline: 'Etihad Airways',
            flightNumber: 'VLR1012',
            departureAirport: 'AUH',
            arrivalAirport: 'TAS',
            departureTime: base4,
            arrivalTime: addHours(base4, 4),
            cabinClass: FlightCabinClass.PREMIUM_ECONOMY,
            availableSeats: 26,
            basePrice: 430,
            flightStatus: FlightStatus.ACTIVE,
        },
    ];
};

const seedFlights = async (): Promise<void> => {
    const mongoUri = resolveMongoUri();

    await mongoose.connect(mongoUri);
    const FlightModel = mongoose.models.Flight || mongoose.model('Flight', FlightSchema);

    const demoFlights = buildSeedFlights();
    await FlightModel.deleteMany({ flightNumber: { $regex: /^VLR\d+/ } });
    await FlightModel.insertMany(demoFlights);

    console.log(`Seed completed: inserted ${demoFlights.length} flights`);
    await mongoose.disconnect();
};

seedFlights().catch(async (error) => {
    console.error('Flights seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
