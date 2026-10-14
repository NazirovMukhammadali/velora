import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import RentcarSchema from '../schemas/Rentcar.model';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../libs/enums/rentcar.enum';

type SeedRentcar = {
	carTitle: string;
	carLocation: string;
	carCategory: RentcarCategory;
	transmission: TransmissionType;
	seats: number;
	dailyPrice: number;
	availableCars: number;
	carImages: string[];
	carDesc: string;
	rentcarStatus: RentcarStatus;
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

/** Earlier versions named every car "Velora …" with mismatched photos; those rows are fixed in place. */
type SeedRentcarWithLegacy = SeedRentcar & { legacyTitle: string };

const buildSeedRentcars = (): SeedRentcarWithLegacy[] => [
	{
		legacyTitle: 'Velora City Sedan',
		carTitle: 'Toyota Camry',
		carLocation: 'Tashkent',
		carCategory: RentcarCategory.SEDAN,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		dailyPrice: 55,
		availableCars: 12,
		carImages: [photo('photo-1621007947382-bb3c3994e3fb')],
		carDesc: 'Comfortable mid-size sedan with climate control — ideal for business trips and the drive to Chimgan.',
		rentcarStatus: RentcarStatus.ACTIVE,
	},
	{
		legacyTitle: 'Velora Desert SUV',
		carTitle: 'Range Rover Sport',
		carLocation: 'Dubai',
		carCategory: RentcarCategory.SUV,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		dailyPrice: 180,
		availableCars: 8,
		carImages: [photo('photo-1563720223185-11003d516935')],
		carDesc: 'Luxury SUV with air suspension, equally at home on Sheikh Zayed Road and the road to Hatta.',
		rentcarStatus: RentcarStatus.ACTIVE,
	},
	{
		legacyTitle: 'Velora Coupe Sport',
		carTitle: 'Mercedes-AMG GT',
		carLocation: 'Seoul',
		carCategory: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 2,
		dailyPrice: 240,
		availableCars: 4,
		carImages: [photo('photo-1617814076367-b759c7d7e738')],
		carDesc: 'Front-mid-engine V8 sports car for a weekend drive along the east coast to Gangneung.',
		rentcarStatus: RentcarStatus.ACTIVE,
	},
	{
		legacyTitle: 'Velora Family Van',
		carTitle: 'Volkswagen Westfalia Camper',
		carLocation: 'Istanbul',
		carCategory: RentcarCategory.VAN,
		transmission: TransmissionType.MANUAL,
		seats: 4,
		dailyPrice: 95,
		availableCars: 3,
		carImages: [photo('photo-1527786356703-4b100091cd2c')],
		carDesc:
			'Classic pop-top camper with beds and a kitchenette — made for the Aegean coast and Cappadocia road trips.',
		rentcarStatus: RentcarStatus.ACTIVE,
	},
	{
		legacyTitle: 'Velora Compact Hatch',
		carTitle: 'Hyundai i30',
		carLocation: 'Tokyo',
		carCategory: RentcarCategory.HATCHBACK,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		dailyPrice: 55,
		availableCars: 10,
		carImages: [photo('photo-1550355291-bbee04a92027')],
		carDesc: 'Economical compact hatchback that is easy to park — great for city routes and day trips to Kamakura.',
		rentcarStatus: RentcarStatus.ACTIVE,
	},
];

const seedRentcars = async (): Promise<void> => {
	const mongoUri = resolveMongoUri();
	await mongoose.connect(mongoUri);
	const RentcarModel = mongoose.models.Rentcar || mongoose.model('Rentcar', RentcarSchema);

	let created = 0;
	let updated = 0;
	for (const { legacyTitle, ...car } of buildSeedRentcars()) {
		// Update in place (same _id) so bookings, likes and views on the car stay attached.
		const result = await RentcarModel.updateOne(
			{ carLocation: car.carLocation, carTitle: { $in: [car.carTitle, legacyTitle] } },
			{ $set: car },
		).exec();
		if (result.matchedCount > 0) {
			updated += 1;
		} else {
			await RentcarModel.create(car);
			created += 1;
		}
	}

	console.log(`Seed completed: ${updated} rentcars updated, ${created} rentcars created`);
	await mongoose.disconnect();
};

seedRentcars().catch(async (error) => {
	console.error('Rentcar seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
