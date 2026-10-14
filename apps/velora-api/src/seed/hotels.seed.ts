import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import HotelSchema from '../schemas/Hotel.model';
import { HotelStatus } from '../libs/enums/hotel.enum';

type SeedHotel = {
	hotelName: string;
	hotelLocation: string;
	hotelAddress: string;
	hotelPrice: number;
	hotelStars: number;
	availableRooms: number;
	hotelImages: string[];
	hotelDesc: string;
	hotelStatus: HotelStatus;
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

const photo = (id: string): string => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Earlier versions named every hotel "Velora …"; those rows are renamed in place. */
type SeedHotelWithLegacy = SeedHotel & { legacyName: string };

const buildSeedHotels = (): SeedHotelWithLegacy[] => [
	{
		legacyName: 'Velora Grand Tashkent',
		hotelName: 'Amir Temur Grand Hotel',
		hotelLocation: 'Tashkent',
		hotelAddress: 'Amir Temur Avenue 108, Tashkent',
		hotelPrice: 120,
		hotelStars: 4,
		availableRooms: 42,
		hotelImages: [
			photo('photo-1590381105924-c72589b9ef3f'),
			photo('photo-1578898886225-c7c894047899'),
			photo('photo-1715966743489-0ac1138420a5'),
		],
		hotelDesc:
			'Classic business hotel on Amir Temur Square, a short walk from the metro, Broadway Street and the Museum of Timurids.',
		hotelStatus: HotelStatus.ACTIVE,
	},
	{
		legacyName: 'Velora Marina Dubai',
		hotelName: 'Marina Pearl Hotel',
		hotelLocation: 'Dubai',
		hotelAddress: 'Dubai Marina Walk 22, Dubai',
		hotelPrice: 260,
		hotelStars: 5,
		availableRooms: 28,
		hotelImages: [photo('photo-1571003123894-1f0594d2b5d9'), photo('photo-1631049035182-249067d7618e')],
		hotelDesc:
			'Sea-view rooms on Dubai Marina Walk with a cabana infinity pool, direct beach access at JBR and evening yacht departures nearby.',
		hotelStatus: HotelStatus.ACTIVE,
	},
	{
		legacyName: 'Velora Midtown Seoul',
		hotelName: 'Euljiro Midtown Hotel',
		hotelLocation: 'Seoul',
		hotelAddress: 'Jung-gu Euljiro 45, Seoul',
		hotelPrice: 170,
		hotelStars: 4,
		availableRooms: 36,
		hotelImages: [photo('photo-1629140727571-9b5c6f6267b4'), photo('photo-1595526114035-0d45ed16cfbf')],
		hotelDesc:
			"Modern design hotel between Myeongdong and Dongdaemun, close to Euljiro's retro bars and two subway lines.",
		hotelStatus: HotelStatus.ACTIVE,
	},
	{
		legacyName: 'Velora Riverside Istanbul',
		hotelName: 'Karaköy Riverside Hotel',
		hotelLocation: 'Istanbul',
		hotelAddress: 'Karakoy Sahil 7, Istanbul',
		hotelPrice: 145,
		hotelStars: 4,
		availableRooms: 31,
		hotelImages: [photo('photo-1559599238-308793637427'), photo('photo-1584132915807-fd1f5fbc078f')],
		hotelDesc:
			'Waterfront rooms in Karaköy with Bosphorus views, steps from the Galata Bridge ferries and the Istanbul Modern museum.',
		hotelStatus: HotelStatus.ACTIVE,
	},
	{
		legacyName: 'Velora Boutique Paris',
		hotelName: 'Maison Rivoli Boutique Hotel',
		hotelLocation: 'Paris',
		hotelAddress: 'Rue de Rivoli 89, Paris',
		hotelPrice: 310,
		hotelStars: 5,
		availableRooms: 14,
		hotelImages: [photo('photo-1505693416388-ac5ce068fe85'), photo('photo-1540518614846-7eded433c457')],
		hotelDesc:
			'Boutique hotel on Rue de Rivoli facing the Louvre, with Haussmann-era suites and breakfast on a private courtyard.',
		hotelStatus: HotelStatus.ACTIVE,
	},
];

const seedHotels = async (): Promise<void> => {
	const mongoUri = resolveMongoUri();
	await mongoose.connect(mongoUri);
	const HotelModel = mongoose.models.Hotel || mongoose.model('Hotel', HotelSchema);

	let created = 0;
	let updated = 0;
	for (const { legacyName, ...hotel } of buildSeedHotels()) {
		// Update in place (same _id) so bookings, likes and views on the hotel stay attached.
		const result = await HotelModel.updateOne(
			{ hotelName: { $in: [hotel.hotelName, legacyName] } },
			{ $set: hotel },
		).exec();
		if (result.matchedCount > 0) {
			updated += 1;
		} else {
			await HotelModel.create(hotel);
			created += 1;
		}
	}

	console.log(`Seed completed: ${updated} hotels updated, ${created} hotels created`);
	await mongoose.disconnect();
};

seedHotels().catch(async (error) => {
	console.error('Hotels seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
