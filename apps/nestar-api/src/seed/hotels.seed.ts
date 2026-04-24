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

const buildSeedHotels = (): SeedHotel[] => [
    {
        hotelName: 'Velora Grand Tashkent',
        hotelLocation: 'Tashkent',
        hotelAddress: 'Amir Temur Avenue 108, Tashkent',
        hotelPrice: 120,
        hotelStars: 4,
        availableRooms: 42,
        hotelImages: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'],
        hotelDesc: 'Business-friendly stay near city center and metro.',
        hotelStatus: HotelStatus.ACTIVE,
    },
    {
        hotelName: 'Velora Marina Dubai',
        hotelLocation: 'Dubai',
        hotelAddress: 'Dubai Marina Walk 22, Dubai',
        hotelPrice: 260,
        hotelStars: 5,
        availableRooms: 28,
        hotelImages: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200'],
        hotelDesc: 'Luxury sea-view rooms with premium service.',
        hotelStatus: HotelStatus.ACTIVE,
    },
    {
        hotelName: 'Velora Midtown Seoul',
        hotelLocation: 'Seoul',
        hotelAddress: 'Jung-gu Euljiro 45, Seoul',
        hotelPrice: 170,
        hotelStars: 4,
        availableRooms: 36,
        hotelImages: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200'],
        hotelDesc: 'Modern design hotel close to shopping districts.',
        hotelStatus: HotelStatus.ACTIVE,
    },
    {
        hotelName: 'Velora Riverside Istanbul',
        hotelLocation: 'Istanbul',
        hotelAddress: 'Karakoy Sahil 7, Istanbul',
        hotelPrice: 145,
        hotelStars: 4,
        availableRooms: 31,
        hotelImages: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200'],
        hotelDesc: 'Comfortable suites with Bosphorus access nearby.',
        hotelStatus: HotelStatus.ACTIVE,
    },
    {
        hotelName: 'Velora Boutique Paris',
        hotelLocation: 'Paris',
        hotelAddress: 'Rue de Rivoli 89, Paris',
        hotelPrice: 310,
        hotelStars: 5,
        availableRooms: 14,
        hotelImages: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200'],
        hotelDesc: 'Boutique luxury in the heart of Paris attractions.',
        hotelStatus: HotelStatus.ACTIVE,
    },
];

const seedHotels = async (): Promise<void> => {
    const mongoUri = resolveMongoUri();
    await mongoose.connect(mongoUri);
    const HotelModel = mongoose.models.Hotel || mongoose.model('Hotel', HotelSchema);

    const demoHotels = buildSeedHotels();
    await HotelModel.deleteMany({ hotelName: { $regex: /^Velora / } });
    await HotelModel.insertMany(demoHotels);

    console.log(`Seed completed: inserted ${demoHotels.length} hotels`);
    await mongoose.disconnect();
};

seedHotels().catch(async (error) => {
    console.error('Hotels seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
