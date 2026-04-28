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

const buildSeedRentcars = (): SeedRentcar[] => [
    {
        carTitle: 'Velora City Sedan',
        carLocation: 'Tashkent',
        carCategory: RentcarCategory.SEDAN,
        transmission: TransmissionType.AUTOMATIC,
        seats: 4,
        dailyPrice: 45,
        availableCars: 12,
        carImages: ['https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200'],
        carDesc: 'Comfortable city sedan for daily business trips.',
        rentcarStatus: RentcarStatus.ACTIVE,
    },
    {
        carTitle: 'Velora Desert SUV',
        carLocation: 'Dubai',
        carCategory: RentcarCategory.SUV,
        transmission: TransmissionType.AUTOMATIC,
        seats: 7,
        dailyPrice: 110,
        availableCars: 8,
        carImages: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1200'],
        carDesc: 'Powerful SUV for long rides and family travel.',
        rentcarStatus: RentcarStatus.ACTIVE,
    },
    {
        carTitle: 'Velora Coupe Sport',
        carLocation: 'Seoul',
        carCategory: RentcarCategory.COUPE,
        transmission: TransmissionType.MANUAL,
        seats: 2,
        dailyPrice: 95,
        availableCars: 4,
        carImages: ['https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=1200'],
        carDesc: 'Sport-style coupe for premium short-term rentals.',
        rentcarStatus: RentcarStatus.ACTIVE,
    },
    {
        carTitle: 'Velora Family Van',
        carLocation: 'Istanbul',
        carCategory: RentcarCategory.VAN,
        transmission: TransmissionType.AUTOMATIC,
        seats: 8,
        dailyPrice: 88,
        availableCars: 6,
        carImages: ['https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1200'],
        carDesc: 'Spacious van for group and airport transfer.',
        rentcarStatus: RentcarStatus.ACTIVE,
    },
    {
        carTitle: 'Velora Compact Hatch',
        carLocation: 'Tokyo',
        carCategory: RentcarCategory.HATCHBACK,
        transmission: TransmissionType.AUTOMATIC,
        seats: 4,
        dailyPrice: 55,
        availableCars: 10,
        carImages: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200'],
        carDesc: 'Economic compact choice for city routes.',
        rentcarStatus: RentcarStatus.ACTIVE,
    },
];

const seedRentcars = async (): Promise<void> => {
    const mongoUri = resolveMongoUri();
    await mongoose.connect(mongoUri);
    const RentcarModel = mongoose.models.Rentcar || mongoose.model('Rentcar', RentcarSchema);

    const demoRentcars = buildSeedRentcars();
    await RentcarModel.deleteMany({ carTitle: { $regex: /^Velora / } });
    await RentcarModel.insertMany(demoRentcars);

    console.log(`Seed completed: inserted ${demoRentcars.length} rentcars`);
    await mongoose.disconnect();
};

seedRentcars().catch(async (error) => {
    console.error('Rentcar seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
