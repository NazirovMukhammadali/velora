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

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type FlightRoute = Omit<SeedFlight, 'departureTime' | 'arrivalTime' | 'flightStatus'> & {
	/** Placeholder number used by earlier versions of this seed (VLR1001…); renamed in place. */
	legacyNumber: string;
	durationHours: number;
};

const ROUTES: FlightRoute[] = [
	{
		legacyNumber: 'VLR1001',
		airline: 'Uzbekistan Airways',
		flightNumber: 'HY273',
		departureAirport: 'TAS',
		arrivalAirport: 'IST',
		durationHours: 5,
		cabinClass: FlightCabinClass.ECONOMY,
		availableSeats: 32,
		basePrice: 340,
	},
	{
		legacyNumber: 'VLR1002',
		airline: 'Uzbekistan Airways',
		flightNumber: 'HY355',
		departureAirport: 'TAS',
		arrivalAirport: 'DXB',
		durationHours: 3.5,
		cabinClass: FlightCabinClass.BUSINESS,
		availableSeats: 18,
		basePrice: 820,
	},
	{
		legacyNumber: 'VLR1003',
		airline: 'Turkish Airlines',
		flightNumber: 'TK1971',
		departureAirport: 'IST',
		arrivalAirport: 'LHR',
		durationHours: 4,
		cabinClass: FlightCabinClass.PREMIUM_ECONOMY,
		availableSeats: 24,
		basePrice: 410,
	},
	{
		legacyNumber: 'VLR1004',
		airline: 'Emirates',
		flightNumber: 'EK352',
		departureAirport: 'DXB',
		arrivalAirport: 'SIN',
		durationHours: 7.5,
		cabinClass: FlightCabinClass.ECONOMY,
		availableSeats: 40,
		basePrice: 460,
	},
	{
		legacyNumber: 'VLR1005',
		airline: 'Qatar Airways',
		flightNumber: 'QR39',
		departureAirport: 'DOH',
		arrivalAirport: 'CDG',
		durationHours: 6.5,
		cabinClass: FlightCabinClass.BUSINESS,
		availableSeats: 20,
		basePrice: 1890,
	},
	{
		legacyNumber: 'VLR1006',
		airline: 'Lufthansa',
		flightNumber: 'LH404',
		departureAirport: 'FRA',
		arrivalAirport: 'JFK',
		durationHours: 8.5,
		cabinClass: FlightCabinClass.FIRST,
		availableSeats: 8,
		basePrice: 4900,
	},
	{
		legacyNumber: 'VLR1007',
		airline: 'British Airways',
		flightNumber: 'BA175',
		departureAirport: 'LHR',
		arrivalAirport: 'JFK',
		durationHours: 8,
		cabinClass: FlightCabinClass.ECONOMY,
		availableSeats: 44,
		basePrice: 590,
	},
	{
		legacyNumber: 'VLR1008',
		airline: 'Air France',
		flightNumber: 'AF1204',
		departureAirport: 'CDG',
		arrivalAirport: 'FCO',
		durationHours: 2,
		cabinClass: FlightCabinClass.ECONOMY,
		availableSeats: 38,
		basePrice: 210,
	},
	{
		legacyNumber: 'VLR1009',
		airline: 'Korean Air',
		flightNumber: 'KE703',
		departureAirport: 'ICN',
		arrivalAirport: 'NRT',
		durationHours: 2.5,
		cabinClass: FlightCabinClass.PREMIUM_ECONOMY,
		availableSeats: 28,
		basePrice: 260,
	},
	{
		legacyNumber: 'VLR1010',
		airline: 'Singapore Airlines',
		flightNumber: 'SQ231',
		departureAirport: 'SIN',
		arrivalAirport: 'SYD',
		durationHours: 8,
		cabinClass: FlightCabinClass.BUSINESS,
		availableSeats: 16,
		basePrice: 2150,
	},
	{
		legacyNumber: 'VLR1011',
		airline: 'Japan Airlines',
		flightNumber: 'JL2',
		departureAirport: 'NRT',
		arrivalAirport: 'SFO',
		durationHours: 9.5,
		cabinClass: FlightCabinClass.ECONOMY,
		availableSeats: 34,
		basePrice: 640,
	},
	{
		legacyNumber: 'VLR1012',
		airline: 'Etihad Airways',
		flightNumber: 'EY2521',
		departureAirport: 'AUH',
		arrivalAirport: 'TAS',
		durationHours: 3.5,
		cabinClass: FlightCabinClass.PREMIUM_ECONOMY,
		availableSeats: 26,
		basePrice: 430,
	},
];

/** Departures are always spread over the coming weeks relative to the day the seed runs. */
const buildSeedFlights = (): Array<SeedFlight & { legacyNumber: string }> => {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);

	return ROUTES.map(({ legacyNumber, durationHours, ...route }, index) => {
		const departureTime = new Date(today.getTime() + (5 + index * 4) * DAY_MS + (7 + ((index * 3) % 16)) * HOUR_MS);
		return {
			...route,
			legacyNumber,
			departureTime,
			arrivalTime: new Date(departureTime.getTime() + durationHours * HOUR_MS),
			flightStatus: FlightStatus.ACTIVE,
		};
	});
};

const seedFlights = async (): Promise<void> => {
	const mongoUri = resolveMongoUri();

	await mongoose.connect(mongoUri);
	const FlightModel = mongoose.models.Flight || mongoose.model('Flight', FlightSchema);

	let created = 0;
	let updated = 0;
	for (const { legacyNumber, ...flight } of buildSeedFlights()) {
		// Update in place (same _id) so bookings, likes and views on the flight stay attached.
		const result = await FlightModel.updateOne(
			{ flightNumber: { $in: [flight.flightNumber, legacyNumber] }, cabinClass: flight.cabinClass },
			{ $set: flight },
		).exec();
		if (result.matchedCount > 0) {
			updated += 1;
		} else {
			await FlightModel.create(flight);
			created += 1;
		}
	}

	console.log(`Seed completed: ${updated} flights updated, ${created} flights created`);
	await mongoose.disconnect();
};

seedFlights().catch(async (error) => {
	console.error('Flights seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
