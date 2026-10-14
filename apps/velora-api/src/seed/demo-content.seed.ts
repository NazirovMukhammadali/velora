/**
 * Demo content seed — fills the catalog, agents, community and CS with realistic data.
 *
 * Safe to re-run: every record gets a deterministic _id derived from a stable key, so a re-run
 * replaces exactly the records this script owns and never touches real user data or the other
 * seed scripts (their name prefixes — "VELORA Seed:", "Velora ", "VLR" — are deliberately avoided).
 *
 *   yarn seed:demo            write to the database from .env (MONGO_DEV / MONGO_PROD)
 *   yarn seed:demo --dry-run  validate everything and print counts without writing
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import MemberSchema from '../schemas/Member.model';
import TourSchema from '../schemas/Tour.model';
import HotelSchema from '../schemas/Hotel.model';
import FlightSchema from '../schemas/Flight.model';
import RentcarSchema from '../schemas/Rentcar.model';
import BoardArticleSchema from '../schemas/BoardArticle.model';
import NoticeSchema from '../schemas/Notice.model';
import CommentSchema from '../schemas/Comment.model';
import BookingSchema from '../schemas/Booking.model';
import LikeSchema from '../schemas/Like.model';
import { MemberAuthType, MemberStatus, MemberType } from '../libs/enums/member.enum';
import { TourStatus } from '../libs/enums/tour.enum';
import { HotelStatus } from '../libs/enums/hotel.enum';
import { FlightCabinClass, FlightStatus } from '../libs/enums/flight.enum';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../libs/enums/rentcar.enum';
import { BoardArticleCategory, BoardArticleStatus } from '../libs/enums/board-article.enum';
import { NoticeCategory, NoticeStatus } from '../libs/enums/notice.enum';
import { CommentGroup, CommentStatus } from '../libs/enums/comment.enum';
import { BookingStatus, BookingType } from '../libs/enums/booking.enum';
import { LikeGroup } from '../libs/enums/like.enum';

const DRY_RUN = process.argv.includes('--dry-run');
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/* ------------------------------------------------------------------ helpers */

const loadLocalEnv = (): void => {
	const envPath = resolve(process.cwd(), '.env');
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
	if (!uri) throw new Error(`MongoDB URI is missing. Please set ${isProduction ? 'MONGO_PROD' : 'MONGO_DEV'} in .env`);
	return uri;
};

/** Stable ObjectId for a seed key, so re-runs replace instead of duplicating. */
const demoId = (key: string): Types.ObjectId =>
	new Types.ObjectId(createHash('md5').update(`velora-demo:${key}`).digest('hex').slice(0, 24));

/** Small deterministic number in [min, max] for counters (views, seats…). */
const pick = (key: string, min: number, max: number): number => {
	const n = parseInt(createHash('md5').update(key).digest('hex').slice(0, 8), 16);
	return min + (n % (max - min + 1));
};

const slug = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

/* Unsplash photos verified to return HTTP 200 (see `img` table at the bottom). */
const img = (n: number): string => {
	const id = IMAGES[n];
	if (!id) throw new Error(`Unknown image index ${n}`);
	return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
};

/* ------------------------------------------------------------------ members */

type MemberSeed = {
	nick: string;
	fullName: string;
	phone: string;
	image: number;
	address: string;
	desc: string;
};

const AGENTS: MemberSeed[] = [
	{
		nick: 'sofia_rossi',
		fullName: 'Sofia Rossi',
		phone: '+998771200001',
		image: 110,
		address: 'Rome',
		desc: 'Italy & Mediterranean specialist. 9 years guiding small groups through Rome, Venice and the Greek islands.',
	},
	{
		nick: 'lucas_martin',
		fullName: 'Lucas Martin',
		phone: '+998771200002',
		image: 30,
		address: 'Paris',
		desc: 'European city-break expert — Paris, Barcelona, Amsterdam and Budapest, with a soft spot for food tours.',
	},
	{
		nick: 'emma_clarke',
		fullName: 'Emma Clarke',
		phone: '+998771200003',
		image: 140,
		address: 'London',
		desc: 'Alpine and Nordic journeys: scenic railways, mountain lodges and northern-lights hunting.',
	},
	{
		nick: 'daniel_kim',
		fullName: 'Daniel Kim',
		phone: '+998771200004',
		image: 81,
		address: 'Seoul',
		desc: 'Seoul native. Palaces, hanok stays, night markets and cruises across East Asia.',
	},
	{
		nick: 'yuki_sato',
		fullName: 'Yuki Sato',
		phone: '+998771200005',
		image: 96,
		address: 'Tokyo',
		desc: 'Japan and Southeast Asia — temples, tea ceremonies, neon nights and island retreats.',
	},
	{
		nick: 'omar_haddad',
		fullName: 'Omar Haddad',
		phone: '+998771200006',
		image: 68,
		address: 'Dubai',
		desc: 'Luxury and desert travel from Dubai to the Maldives, Marrakech and Istanbul.',
	},
	{
		nick: 'nilufar_t',
		fullName: 'Nilufar Tursunova',
		phone: '+998771200007',
		image: 19,
		address: 'Tashkent',
		desc: 'Adventure planner: Cappadocia balloons, Kenyan safaris and Himalayan treks.',
	},
	{
		nick: 'james_reid',
		fullName: 'James Reid',
		phone: '+998771200008',
		image: 216,
		address: 'Sydney',
		desc: 'Pacific and North America road trips, harbour cities and national parks.',
	},
];

const USERS: MemberSeed[] = [
	{
		nick: 'aziz_travel',
		fullName: 'Aziz Rahimov',
		phone: '+998771300001',
		image: 9,
		address: 'Tashkent',
		desc: 'Weekend explorer and street-food hunter.',
	},
	{
		nick: 'mia_wander',
		fullName: 'Mia Johnson',
		phone: '+998771300002',
		image: 24,
		address: 'London',
		desc: 'Collecting sunsets on every continent.',
	},
	{
		nick: 'kenji_go',
		fullName: 'Kenji Mori',
		phone: '+998771300003',
		image: 103,
		address: 'Osaka',
		desc: 'Rail fan, ramen critic, slow traveller.',
	},
	{
		nick: 'laura_trips',
		fullName: 'Laura Becker',
		phone: '+998771300004',
		image: 32,
		address: 'Berlin',
		desc: 'Planning the next trip before the current one ends.',
	},
	{
		nick: 'dilnoza_k',
		fullName: 'Dilnoza Karimova',
		phone: '+998771300005',
		image: 89,
		address: 'Samarkand',
		desc: 'Architecture and history lover.',
	},
	{
		nick: 'marco_b',
		fullName: 'Marco Bianchi',
		phone: '+998771300006',
		image: 48,
		address: 'Milan',
		desc: 'Mountains in winter, beaches in summer.',
	},
	{
		nick: 'hana_lee',
		fullName: 'Hana Lee',
		phone: '+998771300007',
		image: 65,
		address: 'Busan',
		desc: 'Café hopper and photo walker.',
	},
	{
		nick: 'tom_walker',
		fullName: 'Tom Walker',
		phone: '+998771300008',
		image: 14,
		address: 'Manchester',
		desc: 'Retired and finally ticking off the bucket list.',
	},
];

/* -------------------------------------------------------------------- tours */

type TourSeed = {
	agent: string;
	title: string;
	location: string;
	days: number;
	price: number;
	images: number[];
	sold: number;
	desc: string;
};

const TOURS: TourSeed[] = [
	{
		agent: 'sofia_rossi',
		title: 'Rome Ancient Wonders',
		location: 'Rome',
		days: 4,
		price: 540,
		images: [123, 78],
		sold: 58,
		desc: 'Skip-the-line Colosseum and Roman Forum, an evening in Trastevere and a guided morning in the Vatican Museums. Central boutique hotel and daily breakfast included.',
	},
	{
		agent: 'sofia_rossi',
		title: 'Venice Canals & Islands',
		location: 'Venice',
		days: 3,
		price: 480,
		images: [74],
		sold: 44,
		desc: 'Gondola ride along the Grand Canal, glass-blowing on Murano and the colourful houses of Burano. Stay steps from the Rialto Bridge.',
	},
	{
		agent: 'sofia_rossi',
		title: 'Cinque Terre Coastal Hike',
		location: 'Cinque Terre',
		days: 4,
		price: 620,
		images: [60, 33],
		sold: 37,
		desc: 'Walk the Blue Trail between the five villages, swim in hidden coves and finish each day with Ligurian seafood and local wine.',
	},
	{
		agent: 'sofia_rossi',
		title: 'Santorini Sunset Escape',
		location: 'Santorini',
		days: 5,
		price: 890,
		images: [91, 141, 27],
		sold: 63,
		desc: 'Cave-suite stay in Oia, a catamaran cruise to the volcanic hot springs and a wine tasting above the caldera at golden hour.',
	},
	{
		agent: 'lucas_martin',
		title: 'Paris Classic Highlights',
		location: 'Paris',
		days: 4,
		price: 690,
		images: [36, 28, 71],
		sold: 81,
		desc: 'Eiffel Tower summit, a Seine dinner cruise, the Louvre with an art historian and a free afternoon in Le Marais.',
	},
	{
		agent: 'lucas_martin',
		title: 'Barcelona Gaudí & Tapas',
		location: 'Barcelona',
		days: 4,
		price: 560,
		images: [144],
		sold: 52,
		desc: 'Sagrada Família and Park Güell with timed entry, a tapas crawl through El Born and a lazy afternoon on Barceloneta beach.',
	},
	{
		agent: 'lucas_martin',
		title: 'Amsterdam Canal Weekend',
		location: 'Amsterdam',
		days: 3,
		price: 430,
		images: [94],
		sold: 40,
		desc: 'Canal cruise, Rijksmuseum highlights, a bike ride to the windmills of Zaanse Schans and a cosy brown-café evening.',
	},
	{
		agent: 'lucas_martin',
		title: 'Budapest Danube Lights',
		location: 'Budapest',
		days: 3,
		price: 360,
		images: [119],
		sold: 33,
		desc: 'Thermal baths at Széchenyi, Buda Castle views, ruin bars in the Jewish Quarter and a night cruise past the lit-up Parliament.',
	},
	{
		agent: 'emma_clarke',
		title: 'London Royal Heritage',
		location: 'London',
		days: 4,
		price: 710,
		images: [47, 86, 57],
		sold: 66,
		desc: 'Changing of the Guard, the Tower of London and Crown Jewels, afternoon tea in Mayfair and a West End show.',
	},
	{
		agent: 'emma_clarke',
		title: 'Swiss Alps Scenic Rail',
		location: 'Interlaken',
		days: 6,
		price: 1390,
		images: [79, 7, 49],
		sold: 28,
		desc: 'Glacier Express panorama cars, Jungfraujoch "Top of Europe" and lakeside nights in Interlaken and Lucerne.',
	},
	{
		agent: 'emma_clarke',
		title: 'Dolomites Lake & Peaks',
		location: 'Dolomites',
		days: 5,
		price: 940,
		images: [16, 35],
		sold: 31,
		desc: 'Rowing on Lago di Braies, the Tre Cime loop and mountain-hut lunches with views over the Italian Dolomites.',
	},
	{
		agent: 'emma_clarke',
		title: 'Iceland Northern Lights',
		location: 'Reykjavik',
		days: 5,
		price: 1180,
		images: [90, 64],
		sold: 47,
		desc: 'Golden Circle, black-sand beaches and waterfalls by day; aurora hunting with a local photographer by night.',
	},
	{
		agent: 'daniel_kim',
		title: 'Seoul Palaces & Hanok Villages',
		location: 'Seoul',
		days: 3,
		price: 340,
		images: [97, 61],
		sold: 72,
		desc: 'Gyeongbokgung in hanbok, Bukchon hanok alleys, a Korean BBQ dinner and a night view from Namsan Tower.',
	},
	{
		agent: 'daniel_kim',
		title: 'Seoul Night Markets & K-Culture',
		location: 'Seoul',
		days: 2,
		price: 220,
		images: [100, 93],
		sold: 55,
		desc: 'Myeongdong street food, Hongdae live music, a K-beauty workshop and the Lotte World Tower observatory.',
	},
	{
		agent: 'daniel_kim',
		title: 'Ha Long Bay Cruise',
		location: 'Ha Long Bay',
		days: 3,
		price: 480,
		images: [82],
		sold: 49,
		desc: 'Overnight junk cruise among limestone karsts, kayaking into hidden lagoons and a sunrise tai-chi session on deck.',
	},
	{
		agent: 'yuki_sato',
		title: 'Kyoto Temples & Tea Ceremony',
		location: 'Kyoto',
		days: 4,
		price: 620,
		images: [23, 113],
		sold: 64,
		desc: 'Fushimi Inari at dawn, Kiyomizu-dera, a private tea ceremony in Gion and a ryokan night with kaiseki dinner.',
	},
	{
		agent: 'yuki_sato',
		title: 'Tokyo Neon Nights',
		location: 'Tokyo',
		days: 3,
		price: 450,
		images: [41, 105],
		sold: 77,
		desc: 'Shibuya Crossing, Shinjuku izakaya alleys, teamLab Planets and a day trip to Asakusa and Senso-ji.',
	},
	{
		agent: 'yuki_sato',
		title: 'Bali Temples & Rice Terraces',
		location: 'Bali',
		days: 5,
		price: 590,
		images: [99, 125, 98],
		sold: 83,
		desc: 'Ulun Danu Beratan, Tegallalang rice terraces, the Gates of Heaven at Lempuyang and a villa stay in Ubud.',
	},
	{
		agent: 'yuki_sato',
		title: 'Bangkok & Chiang Mai Culture Trail',
		location: 'Bangkok',
		days: 6,
		price: 640,
		images: [83, 54],
		sold: 45,
		desc: 'Grand Palace and Wat Arun, Chinatown street food, then north to Chiang Mai temples and an ethical elephant sanctuary.',
	},
	{
		agent: 'omar_haddad',
		title: 'Dubai Skyline & Desert Safari',
		location: 'Dubai',
		days: 4,
		price: 720,
		images: [56, 21, 66],
		sold: 92,
		desc: 'Burj Khalifa at sunset, a dune-bashing safari with Bedouin-style dinner and a dhow cruise along Dubai Marina.',
	},
	{
		agent: 'omar_haddad',
		title: 'Maldives Overwater Retreat',
		location: 'Maldives',
		days: 5,
		price: 1650,
		images: [58, 136],
		sold: 26,
		desc: 'Seaplane transfer, an overwater villa with private deck, snorkelling with manta rays and a sandbank dinner.',
	},
	{
		agent: 'omar_haddad',
		title: 'Marrakech Medina & Atlas',
		location: 'Marrakech',
		days: 5,
		price: 610,
		images: [101],
		sold: 35,
		desc: 'Riad stay in the medina, souks and Jardin Majorelle, then a day in the Atlas Mountains with lunch in a Berber village.',
	},
	{
		agent: 'omar_haddad',
		title: 'Istanbul Two Continents',
		location: 'Istanbul',
		days: 4,
		price: 470,
		images: [80, 106, 75],
		sold: 71,
		desc: 'Hagia Sophia and the Blue Mosque, the Grand Bazaar, a Bosphorus cruise between Europe and Asia and Galata at night.',
	},
	{
		agent: 'nilufar_t',
		title: 'Cappadocia Balloons & Caves',
		location: 'Cappadocia',
		days: 3,
		price: 520,
		images: [88],
		sold: 58,
		desc: 'Sunrise hot-air balloon flight, underground cities, Göreme open-air museum and a cave-hotel stay.',
	},
	{
		agent: 'nilufar_t',
		title: 'Kenya Safari Adventure',
		location: 'Nairobi',
		days: 6,
		price: 1490,
		images: [59, 114],
		sold: 22,
		desc: 'Game drives in the Masai Mara during the migration season, a tented camp and a visit to a Maasai village.',
	},
	{
		agent: 'nilufar_t',
		title: 'Nepal Himalaya Trek',
		location: 'Kathmandu',
		days: 8,
		price: 1120,
		images: [112, 118],
		sold: 19,
		desc: 'Kathmandu heritage sites, then a guided teahouse trek with Everest and Ama Dablam views. Porters included.',
	},
	{
		agent: 'james_reid',
		title: 'Sydney Harbour & Blue Mountains',
		location: 'Sydney',
		days: 5,
		price: 980,
		images: [73, 51],
		sold: 39,
		desc: 'Opera House backstage tour, Bondi to Coogee coastal walk and a day in the Blue Mountains with the Three Sisters.',
	},
	{
		agent: 'james_reid',
		title: 'Singapore City in a Garden',
		location: 'Singapore',
		days: 3,
		price: 520,
		images: [131],
		sold: 48,
		desc: 'Gardens by the Bay light show, Marina Bay Sands skypark, hawker-centre food crawl and Sentosa island.',
	},
	{
		agent: 'james_reid',
		title: 'Grand Canyon Desert Road Trip',
		location: 'Arizona',
		days: 5,
		price: 860,
		images: [12, 29],
		sold: 30,
		desc: 'Self-drive loop through Monument Valley, the Grand Canyon South Rim, Antelope Canyon and Route 66 diners.',
	},
	{
		agent: 'james_reid',
		title: 'New York City Explorer',
		location: 'New York',
		days: 4,
		price: 890,
		images: [17, 26, 95],
		sold: 69,
		desc: 'Top of the Rock, Central Park by bike, a Broadway show and food tours in Chelsea Market and Brooklyn.',
	},
	{
		agent: 'james_reid',
		title: 'San Francisco & Coastal Highway',
		location: 'San Francisco',
		days: 4,
		price: 760,
		images: [6, 34],
		sold: 41,
		desc: 'Golden Gate by bike, Alcatraz, cable cars and a drive down Highway 1 to Big Sur and Carmel.',
	},
];

/* ------------------------------------------------------------------- hotels */

type HotelSeed = {
	name: string;
	location: string;
	address: string;
	price: number;
	stars: number;
	images: number[];
	desc: string;
};

const HOTELS: HotelSeed[] = [
	{
		name: 'Hotel Lumière Saint-Germain',
		location: 'Paris',
		address: '14 Rue Jacob, 75006 Paris',
		price: 340,
		stars: 4,
		images: [147, 36],
		desc: 'Elegant Left Bank rooms a short walk from the Louvre and Notre-Dame, with a courtyard breakfast terrace.',
	},
	{
		name: 'The Kensington Grand',
		location: 'London',
		address: "109 Queen's Gate, London SW7",
		price: 390,
		stars: 5,
		images: [142, 47],
		desc: 'Victorian townhouse hotel near Hyde Park and the museums of South Kensington. Afternoon tea served daily.',
	},
	{
		name: 'Hudson Park Hotel',
		location: 'New York',
		address: '356 W 58th St, New York, NY 10019',
		price: 420,
		stars: 4,
		images: [155, 17],
		desc: 'Modern rooms by Central Park and Columbus Circle with a rooftop bar overlooking Midtown.',
	},
	{
		name: 'Shinjuku Skyline Hotel',
		location: 'Tokyo',
		address: '2-7-2 Nishi-Shinjuku, Tokyo',
		price: 280,
		stars: 4,
		images: [148, 41],
		desc: 'High-floor rooms with city views, two minutes from Shinjuku Station and the Omoide Yokocho alleys.',
	},
	{
		name: 'Bukchon Hanok Stay',
		location: 'Seoul',
		address: '31-9 Bukchon-ro, Jongno-gu, Seoul',
		price: 190,
		stars: 3,
		images: [153, 97],
		desc: 'Traditional hanok guesthouse with ondol-heated rooms and a quiet courtyard between two royal palaces.',
	},
	{
		name: 'Gangnam Central Hotel',
		location: 'Seoul',
		address: '130 Teheran-ro, Gangnam-gu, Seoul',
		price: 230,
		stars: 4,
		images: [137, 93],
		desc: 'Design hotel in the heart of Gangnam with a fitness studio and easy subway access to COEX.',
	},
	{
		name: 'Palm Jumeirah Resort & Spa',
		location: 'Dubai',
		address: 'Crescent Rd, The Palm Jumeirah, Dubai',
		price: 560,
		stars: 5,
		images: [120, 66],
		desc: 'Beachfront resort with infinity pools, a full-service spa and views across the Gulf to the Dubai skyline.',
	},
	{
		name: 'Downtown Dubai Suites',
		location: 'Dubai',
		address: 'Sheikh Mohammed bin Rashid Blvd, Dubai',
		price: 310,
		stars: 4,
		images: [135, 56],
		desc: 'Spacious suites facing the Burj Khalifa and Dubai Fountain, steps from Dubai Mall.',
	},
	{
		name: 'Bosphorus Palace Hotel',
		location: 'Istanbul',
		address: 'Yalıboyu Cd. 64, Beylerbeyi, Istanbul',
		price: 260,
		stars: 5,
		images: [130, 80],
		desc: 'Restored Ottoman mansion on the Asian shore of the Bosphorus with a private boat jetty.',
	},
	{
		name: 'Galata Boutique Rooms',
		location: 'Istanbul',
		address: 'Serdar-ı Ekrem Sk. 12, Beyoğlu, Istanbul',
		price: 140,
		stars: 3,
		images: [8, 75],
		desc: 'Cosy boutique rooms on a café-lined street beneath Galata Tower.',
	},
	{
		name: 'Ubud Jungle Villas',
		location: 'Bali',
		address: 'Jl. Raya Sayan, Ubud, Bali',
		price: 210,
		stars: 4,
		images: [129, 125],
		desc: 'Private pool villas overlooking the Ayung River valley, with daily yoga and Balinese cooking classes.',
	},
	{
		name: 'Seminyak Beach Resort',
		location: 'Bali',
		address: 'Jl. Kayu Aya, Seminyak, Bali',
		price: 260,
		stars: 5,
		images: [121, 99],
		desc: 'Beachfront resort with an infinity pool facing the Indian Ocean sunset and a spa pavilion.',
	},
	{
		name: 'Azure Lagoon Water Villas',
		location: 'Maldives',
		address: 'North Malé Atoll, Maldives',
		price: 890,
		stars: 5,
		images: [58, 136],
		desc: 'Overwater villas with glass floors and direct lagoon access; seaplane transfer from Malé.',
	},
	{
		name: 'Oia Cliffside Suites',
		location: 'Santorini',
		address: 'Oia 847 02, Santorini',
		price: 480,
		stars: 5,
		images: [128, 141],
		desc: 'Cave suites carved into the caldera cliff, each with a private plunge pool and sunset view.',
	},
	{
		name: 'Lake Como Villa Serena',
		location: 'Lake Como',
		address: 'Via Roma 22, Bellagio, Lake Como',
		price: 360,
		stars: 4,
		images: [149, 16],
		desc: 'Lakeside villa with terraced gardens, a private dock and rooms looking across to the Alps.',
	},
	{
		name: 'Roma Rooftop Hotel',
		location: 'Rome',
		address: 'Via del Corso 126, Rome',
		price: 300,
		stars: 4,
		images: [5, 123],
		desc: 'Stylish rooms on Via del Corso with a rooftop terrace bar overlooking the domes of Rome.',
	},
	{
		name: 'Chao Phraya Riverside Hotel',
		location: 'Bangkok',
		address: '48 Charoen Krung Rd, Bang Rak, Bangkok',
		price: 170,
		stars: 5,
		images: [133, 54],
		desc: 'Riverside tower with a free shuttle boat to the Grand Palace and three rooftop restaurants.',
	},
	{
		name: 'Marina Bay View Hotel',
		location: 'Singapore',
		address: '10 Bayfront Ave, Singapore',
		price: 380,
		stars: 5,
		images: [108, 131],
		desc: 'Contemporary rooms with Marina Bay views and an evening pool deck facing the light show.',
	},
	{
		name: 'Bondi Beach House Hotel',
		location: 'Sydney',
		address: '178 Campbell Parade, Bondi Beach, Sydney',
		price: 290,
		stars: 4,
		images: [115, 73],
		desc: 'Beachside hotel across from Bondi with surfboard hire and the coastal walk on the doorstep.',
	},
	{
		name: 'Strip Grand Las Vegas',
		location: 'Las Vegas',
		address: '3600 S Las Vegas Blvd, Las Vegas, NV',
		price: 240,
		stars: 4,
		images: [146, 29],
		desc: 'Classic resort on the Strip with fountain views, a casino floor and easy access to Grand Canyon tours.',
	},
	{
		name: 'Andaman Tropical Resort',
		location: 'Phuket',
		address: '18 Kata Rd, Karon, Phuket',
		price: 190,
		stars: 4,
		images: [70, 67],
		desc: 'Garden resort with lagoon pools, a short walk to Kata Beach and island-hopping boat trips.',
	},
	{
		name: 'Old Town Garden Guesthouse',
		location: 'Samarkand',
		address: '45 Tashkent St, Samarkand',
		price: 75,
		stars: 3,
		images: [150, 145],
		desc: 'Family-run guesthouse with a shaded garden terrace, ten minutes on foot from the Registan.',
	},
	{
		name: 'Interlaken Alpine Lodge',
		location: 'Interlaken',
		address: 'Höheweg 37, 3800 Interlaken',
		price: 320,
		stars: 4,
		images: [132, 79],
		desc: 'Timber lodge between the lakes with Jungfrau views, a sauna and direct access to mountain railways.',
	},
	{
		name: 'Coral Lagoon Resort',
		location: 'Maldives',
		address: 'South Ari Atoll, Maldives',
		price: 640,
		stars: 5,
		images: [136, 50],
		desc: 'Island resort with a house reef, whale-shark excursions and beach villas under the palms.',
	},
	{
		name: 'Riad Atlas Marrakech',
		location: 'Marrakech',
		address: 'Derb Sidi Bouloukat, Medina, Marrakech',
		price: 160,
		stars: 4,
		images: [101, 145],
		desc: 'Traditional riad with a tiled courtyard fountain, rooftop breakfast and hammam, deep in the medina.',
	},
];

/* ----------------------------------------------------------------- rentcars */

type RentcarSeed = {
	title: string;
	location: string;
	category: RentcarCategory;
	transmission: TransmissionType;
	seats: number;
	price: number;
	images: number[];
	desc: string;
};

const RENTCARS: RentcarSeed[] = [
	{
		title: 'Tesla Model 3 Long Range',
		location: 'Seoul',
		category: RentcarCategory.SEDAN,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		price: 95,
		images: [127],
		desc: 'All-electric sedan with 600 km range, Autopilot and free charging at partner hotels.',
	},
	{
		title: 'BMW M5 Competition',
		location: 'Dubai',
		category: RentcarCategory.SEDAN,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		price: 260,
		images: [124],
		desc: 'Executive super-sedan with 617 hp — business comfort with track-day pace.',
	},
	{
		title: 'BMW M4 Coupe',
		location: 'Dubai',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 230,
		images: [138],
		desc: 'Twin-turbo sports coupe, ideal for the coastal roads to Jebel Jais.',
	},
	{
		title: 'Porsche 911 Carrera S',
		location: 'Dubai',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 340,
		images: [139],
		desc: 'The icon: rear-engine balance, PDK gearbox and a sport exhaust.',
	},
	{
		title: 'Lamborghini Huracán EVO',
		location: 'Dubai',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 2,
		price: 890,
		images: [55],
		desc: 'Naturally aspirated V10 supercar. Minimum renter age 25, deposit required.',
	},
	{
		title: 'McLaren 720S',
		location: 'Dubai',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 2,
		price: 1100,
		images: [109],
		desc: 'Dihedral doors and 720 hp. Delivered to your hotel with a full handover briefing.',
	},
	{
		title: 'Ferrari 488 Spider',
		location: 'Dubai',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 2,
		price: 950,
		images: [40],
		desc: 'Open-top Ferrari for sunset drives along Jumeirah Beach Road.',
	},
	{
		title: 'Ford Mustang GT',
		location: 'San Francisco',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 150,
		images: [25],
		desc: 'The classic V8 for a Highway 1 road trip to Big Sur.',
	},
	{
		title: 'Chevrolet Camaro SS',
		location: 'New York',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 140,
		images: [122],
		desc: 'American muscle for weekend escapes to the Hamptons or the Hudson Valley.',
	},
	{
		title: 'Chevrolet Camaro ZL1',
		location: 'Seoul',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 170,
		images: [22],
		desc: 'Supercharged 650 hp coupe with magnetic ride control.',
	},
	{
		title: 'Porsche Panamera 4S',
		location: 'London',
		category: RentcarCategory.SEDAN,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 280,
		images: [39],
		desc: 'Four-door Porsche with all-wheel drive — first-class comfort for a Cotswolds tour.',
	},
	{
		title: 'BMW 4 Series Gran Coupe',
		location: 'London',
		category: RentcarCategory.COUPE,
		transmission: TransmissionType.AUTOMATIC,
		seats: 4,
		price: 160,
		images: [37],
		desc: 'Sleek four-door coupe with adaptive cruise and a large boot for luggage.',
	},
	{
		title: 'Audi RS6 Avant',
		location: 'Paris',
		category: RentcarCategory.SEDAN,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		price: 210,
		images: [151],
		desc: 'Fast estate with quattro grip — perfect for a family trip to the Alps.',
	},
	{
		title: 'Honda CR-V Hybrid',
		location: 'Tokyo',
		category: RentcarCategory.SUV,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		price: 85,
		images: [69],
		desc: 'Comfortable hybrid SUV for day trips to Mount Fuji and Hakone. ETC card included.',
	},
	{
		title: 'Ford Expedition',
		location: 'Las Vegas',
		category: RentcarCategory.SUV,
		transmission: TransmissionType.AUTOMATIC,
		seats: 7,
		price: 130,
		images: [92],
		desc: 'Full-size 7-seat SUV for national-park road trips with lots of luggage.',
	},
	{
		title: 'Nissan Juke',
		location: 'Istanbul',
		category: RentcarCategory.SUV,
		transmission: TransmissionType.MANUAL,
		seats: 5,
		price: 60,
		images: [152],
		desc: 'Compact crossover that is easy to park in the old city.',
	},
	{
		title: 'Volkswagen Polo',
		location: 'Rome',
		category: RentcarCategory.HATCHBACK,
		transmission: TransmissionType.MANUAL,
		seats: 5,
		price: 45,
		images: [107],
		desc: 'Economical hatchback for Tuscan countryside drives.',
	},
	{
		title: 'Fiat 500',
		location: 'Rome',
		category: RentcarCategory.HATCHBACK,
		transmission: TransmissionType.MANUAL,
		seats: 4,
		price: 40,
		images: [116],
		desc: 'The Italian classic — tiny, stylish and made for narrow streets.',
	},
	{
		title: 'Hyundai Accent',
		location: 'Tashkent',
		category: RentcarCategory.SEDAN,
		transmission: TransmissionType.AUTOMATIC,
		seats: 5,
		price: 38,
		images: [156],
		desc: 'Reliable city sedan with air conditioning, great for trips to Chimgan.',
	},
	{
		title: 'Volkswagen Camper Van',
		location: 'Sydney',
		category: RentcarCategory.VAN,
		transmission: TransmissionType.MANUAL,
		seats: 4,
		price: 120,
		images: [12],
		desc: 'Retro camper with a pop-top bed and kitchenette for the Great Ocean Road.',
	},
];

/* ------------------------------------------------------------------ flights */

type FlightSeed = {
	airline: string;
	number: string;
	from: string;
	to: string;
	hours: number;
	cabin: FlightCabinClass;
	price: number;
};

// Airports stay within the set the web client maps to city names.
const FLIGHTS: FlightSeed[] = [
	{
		airline: 'Korean Air',
		number: 'KE907',
		from: 'ICN',
		to: 'LHR',
		hours: 14,
		cabin: FlightCabinClass.ECONOMY,
		price: 780,
	},
	{
		airline: 'Korean Air',
		number: 'KE81',
		from: 'ICN',
		to: 'JFK',
		hours: 14,
		cabin: FlightCabinClass.BUSINESS,
		price: 2450,
	},
	{
		airline: 'Asiana Airlines',
		number: 'OZ102',
		from: 'ICN',
		to: 'NRT',
		hours: 2.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 190,
	},
	{
		airline: 'Japan Airlines',
		number: 'JL5',
		from: 'NRT',
		to: 'JFK',
		hours: 12.75,
		cabin: FlightCabinClass.PREMIUM_ECONOMY,
		price: 1380,
	},
	{ airline: 'ANA', number: 'NH7', from: 'NRT', to: 'SFO', hours: 9.5, cabin: FlightCabinClass.ECONOMY, price: 890 },
	{
		airline: 'Singapore Airlines',
		number: 'SQ322',
		from: 'SIN',
		to: 'LHR',
		hours: 14,
		cabin: FlightCabinClass.FIRST,
		price: 5200,
	},
	{
		airline: 'Singapore Airlines',
		number: 'SQ221',
		from: 'SIN',
		to: 'SYD',
		hours: 8,
		cabin: FlightCabinClass.ECONOMY,
		price: 560,
	},
	{ airline: 'Qantas', number: 'QF5', from: 'SYD', to: 'SIN', hours: 8, cabin: FlightCabinClass.BUSINESS, price: 1650 },
	{
		airline: 'Emirates',
		number: 'EK1',
		from: 'DXB',
		to: 'LHR',
		hours: 7.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 640,
	},
	{
		airline: 'Emirates',
		number: 'EK201',
		from: 'DXB',
		to: 'JFK',
		hours: 14,
		cabin: FlightCabinClass.FIRST,
		price: 6800,
	},
	{
		airline: 'Emirates',
		number: 'EK354',
		from: 'DXB',
		to: 'SIN',
		hours: 7.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 520,
	},
	{
		airline: 'Qatar Airways',
		number: 'QR1',
		from: 'DOH',
		to: 'LHR',
		hours: 7,
		cabin: FlightCabinClass.BUSINESS,
		price: 2100,
	},
	{
		airline: 'Qatar Airways',
		number: 'QR701',
		from: 'DOH',
		to: 'JFK',
		hours: 13.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 890,
	},
	{
		airline: 'Etihad Airways',
		number: 'EY11',
		from: 'AUH',
		to: 'LHR',
		hours: 7.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 610,
	},
	{
		airline: 'Turkish Airlines',
		number: 'TK1',
		from: 'IST',
		to: 'JFK',
		hours: 11,
		cabin: FlightCabinClass.ECONOMY,
		price: 720,
	},
	{
		airline: 'Turkish Airlines',
		number: 'TK1983',
		from: 'IST',
		to: 'LHR',
		hours: 4,
		cabin: FlightCabinClass.ECONOMY,
		price: 210,
	},
	{
		airline: 'Turkish Airlines',
		number: 'TK1823',
		from: 'IST',
		to: 'CDG',
		hours: 3.5,
		cabin: FlightCabinClass.BUSINESS,
		price: 690,
	},
	{
		airline: 'Turkish Airlines',
		number: 'TK1863',
		from: 'IST',
		to: 'FCO',
		hours: 3,
		cabin: FlightCabinClass.ECONOMY,
		price: 180,
	},
	{
		airline: 'Uzbekistan Airways',
		number: 'HY601',
		from: 'TAS',
		to: 'ICN',
		hours: 7,
		cabin: FlightCabinClass.ECONOMY,
		price: 480,
	},
	{
		airline: 'Uzbekistan Airways',
		number: 'HY101',
		from: 'TAS',
		to: 'FRA',
		hours: 6.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 410,
	},
	{
		airline: 'Uzbekistan Airways',
		number: 'HY231',
		from: 'TAS',
		to: 'CDG',
		hours: 7,
		cabin: FlightCabinClass.BUSINESS,
		price: 1250,
	},
	{
		airline: 'British Airways',
		number: 'BA117',
		from: 'LHR',
		to: 'JFK',
		hours: 8,
		cabin: FlightCabinClass.ECONOMY,
		price: 560,
	},
	{
		airline: 'British Airways',
		number: 'BA285',
		from: 'LHR',
		to: 'SFO',
		hours: 11,
		cabin: FlightCabinClass.PREMIUM_ECONOMY,
		price: 1490,
	},
	{
		airline: 'British Airways',
		number: 'BA478',
		from: 'LHR',
		to: 'BCN',
		hours: 2,
		cabin: FlightCabinClass.ECONOMY,
		price: 120,
	},
	{
		airline: 'Air France',
		number: 'AF6',
		from: 'CDG',
		to: 'JFK',
		hours: 8.5,
		cabin: FlightCabinClass.ECONOMY,
		price: 590,
	},
	{
		airline: 'Air France',
		number: 'AF1404',
		from: 'CDG',
		to: 'FCO',
		hours: 2,
		cabin: FlightCabinClass.ECONOMY,
		price: 110,
	},
	{
		airline: 'Lufthansa',
		number: 'LH400',
		from: 'FRA',
		to: 'JFK',
		hours: 9,
		cabin: FlightCabinClass.BUSINESS,
		price: 2300,
	},
	{
		airline: 'Lufthansa',
		number: 'LH1112',
		from: 'FRA',
		to: 'BCN',
		hours: 2,
		cabin: FlightCabinClass.ECONOMY,
		price: 130,
	},
	{
		airline: 'ITA Airways',
		number: 'AZ608',
		from: 'FCO',
		to: 'JFK',
		hours: 10,
		cabin: FlightCabinClass.ECONOMY,
		price: 640,
	},
	{
		airline: 'United Airlines',
		number: 'UA837',
		from: 'SFO',
		to: 'NRT',
		hours: 11,
		cabin: FlightCabinClass.ECONOMY,
		price: 930,
	},
];

/* ---------------------------------------------------------------- community */

type ArticleSeed = {
	author: string;
	category: BoardArticleCategory;
	title: string;
	image?: number;
	content: string[];
	daysAgo: number;
};

const ARTICLES: ArticleSeed[] = [
	{
		author: 'mia_wander',
		category: BoardArticleCategory.FREE,
		title: 'My first solo trip: 5 days in Lisbon on a budget',
		image: 78,
		daysAgo: 2,
		content: [
			'I finally did it — a solo trip! I stayed in a hostel in Alfama, took tram 28 everywhere and ate way too many pastéis de nata.',
			'Total spend was under $500 including flights. Happy to answer questions if anyone is planning the same.',
		],
	},
	{
		author: 'aziz_travel',
		category: BoardArticleCategory.FREE,
		title: 'Tashkent to Istanbul: is the morning flight worth it?',
		image: 2,
		daysAgo: 3,
		content: [
			'Took the early flight last week. You land before lunch and get a full afternoon in Sultanahmet.',
			'Only downside: 4 a.m. taxi to the airport. Would still do it again.',
		],
	},
	{
		author: 'kenji_go',
		category: BoardArticleCategory.FREE,
		title: 'Japan Rail Pass after the price increase — still worth it?',
		image: 105,
		daysAgo: 4,
		content: [
			'I did the maths for a Tokyo–Kyoto–Hiroshima–Osaka loop. With the new price it only pays off if you take at least two long Shinkansen rides.',
			'For shorter trips, regional passes like JR West Kansai are much better value.',
		],
	},
	{
		author: 'laura_trips',
		category: BoardArticleCategory.FREE,
		title: 'Packing list for two weeks with only a carry-on',
		image: 43,
		daysAgo: 5,
		content: [
			'Packing cubes, three merino tops, one pair of shoes you can walk 20 km in, and a light rain jacket.',
			'The trick is laundry every 4–5 days. Hotels with a washing machine are gold.',
		],
	},
	{
		author: 'hana_lee',
		category: BoardArticleCategory.FREE,
		title: 'Best cafés near Bukchon Hanok Village',
		image: 97,
		daysAgo: 6,
		content: [
			'Go early — by 11 a.m. the alleys get crowded. My favourite spot has a rooftop with a view of the hanok roofs.',
			'Try the injeolmi bingsu, it is perfect after walking around Gyeongbokgung.',
		],
	},
	{
		author: 'tom_walker',
		category: BoardArticleCategory.FREE,
		title: 'Travelling at 65: the Swiss rail trip I always wanted',
		image: 79,
		daysAgo: 8,
		content: [
			'Booked the Swiss Alps Scenic Rail tour and it was smooth from start to finish. Luggage was transferred between hotels for us.',
			'The Glacier Express panorama car is worth every franc.',
		],
	},
	{
		author: 'marco_b',
		category: BoardArticleCategory.FREE,
		title: 'Dolomites in late September — empty trails, golden larches',
		image: 16,
		daysAgo: 10,
		content: [
			'Most huts close at the end of September, so plan carefully, but the colours are unbelievable.',
			'Lago di Braies at 7 a.m. had maybe ten people.',
		],
	},
	{
		author: 'dilnoza_k',
		category: BoardArticleCategory.FREE,
		title: 'Samarkand at night: where to see the Registan lights',
		image: 150,
		daysAgo: 12,
		content: [
			'The light show starts after sunset most evenings. Grab a seat on the steps facing Ulugh Beg Madrasa.',
			'Afterwards walk to the Bibi-Khanym mosque — it is lit up too and much quieter.',
		],
	},
	{
		author: 'mia_wander',
		category: BoardArticleCategory.FREE,
		title: 'Travel insurance: what actually got covered for me',
		daysAgo: 14,
		content: [
			'My bag was delayed for three days in Singapore. The policy covered clothes and toiletries up to $300 with receipts.',
			'Lesson learned: always keep receipts and get a written delay report at the airport.',
		],
	},
	{
		author: 'kenji_go',
		category: BoardArticleCategory.FREE,
		title: 'Night bus vs. night train in Southeast Asia',
		image: 54,
		daysAgo: 16,
		content: [
			'The Bangkok–Chiang Mai sleeper train was comfortable and clean. The night bus back was cheaper but I barely slept.',
			'If your budget allows, take the train at least one way.',
		],
	},
	{
		author: 'laura_trips',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Recommend: Kyoto Temples & Tea Ceremony tour',
		image: 23,
		daysAgo: 3,
		content: [
			'Yuki planned everything perfectly. Fushimi Inari at sunrise with almost nobody there was magical.',
			'The ryokan dinner was the highlight of my whole Japan trip.',
		],
	},
	{
		author: 'aziz_travel',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Top 5 street foods to try in Istanbul',
		image: 44,
		daysAgo: 7,
		content: [
			'1) Balık ekmek by the Galata Bridge, 2) simit with tea, 3) midye dolma, 4) kokoreç (if you are brave), 5) künefe for dessert.',
			'Everything is cheap and delicious — skip the touristy restaurants.',
		],
	},
	{
		author: 'hana_lee',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Bali: Ubud for culture, Seminyak for sunsets',
		image: 125,
		daysAgo: 9,
		content: [
			'Spend at least three nights in Ubud for the rice terraces and temples, then move to the coast.',
			'Seminyak beach clubs are pricey, but the sunset views are worth one splurge night.',
		],
	},
	{
		author: 'tom_walker',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Why I booked an agent for my first safari',
		image: 59,
		daysAgo: 11,
		content: [
			'A safari has so many moving parts — parks, permits, camps, transfers. Nilufar sorted all of it.',
			'We saw the river crossing on day two. I still cannot believe it.',
		],
	},
	{
		author: 'marco_b',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Rent a car in Rome? Only for the countryside',
		image: 116,
		daysAgo: 13,
		content: [
			'Do not drive in central Rome — ZTL zones and fines everywhere. Pick the car up on your way out to Tuscany.',
			'A small hatchback like a Fiat 500 makes parking in hill towns much easier.',
		],
	},
	{
		author: 'dilnoza_k',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Hidden gem: Cappadocia cave hotels',
		image: 88,
		daysAgo: 15,
		content: [
			'Waking up at 5 a.m. to watch hundreds of balloons from the terrace is unforgettable.',
			'Book the balloon flight for your first morning so you have backup days if the weather cancels it.',
		],
	},
	{
		author: 'mia_wander',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Best viewpoints in Santorini that are not in Oia',
		image: 134,
		daysAgo: 18,
		content: [
			'Imerovigli has the same caldera views with half the crowds. The walk from Fira to Oia is also stunning.',
			'Go to Pyrgos for sunset if you want to avoid the Oia crowds entirely.',
		],
	},
	{
		author: 'kenji_go',
		category: BoardArticleCategory.RECOMMEND,
		title: 'Singapore hawker centres you should not miss',
		image: 131,
		daysAgo: 20,
		content: [
			'Maxwell for chicken rice, Lau Pa Sat for satay at night, and Old Airport Road for a bit of everything.',
			'Bring cash and a packet of tissues to "chope" (reserve) your table.',
		],
	},
	{
		author: 'daniel_kim',
		category: BoardArticleCategory.NEWS,
		title: 'Seoul palaces offer free entry when wearing hanbok',
		image: 61,
		daysAgo: 1,
		content: [
			'Visitors wearing hanbok still get free admission to Gyeongbokgung, Changdeokgung and Deoksugung.',
			'Rental shops near the palaces open around 9 a.m.; reserve ahead on weekends.',
		],
	},
	{
		author: 'omar_haddad',
		category: BoardArticleCategory.NEWS,
		title: 'Dubai winter season: best months to visit',
		image: 56,
		daysAgo: 4,
		content: [
			'November to March brings 20–28°C days — perfect for desert safaris and outdoor dining.',
			'Expect higher hotel prices around New Year and during major events; book early.',
		],
	},
	{
		author: 'emma_clarke',
		category: BoardArticleCategory.NEWS,
		title: 'Northern lights forecast looks strong this winter',
		image: 90,
		daysAgo: 6,
		content: [
			'Solar activity is near its peak this cycle, which means more frequent and stronger auroras.',
			'Iceland, northern Norway and Finnish Lapland are the most reliable places to see them.',
		],
	},
	{
		author: 'lucas_martin',
		category: BoardArticleCategory.NEWS,
		title: 'Louvre now requires timed tickets — plan ahead',
		image: 71,
		daysAgo: 9,
		content: [
			'Entry to the Louvre works with timed online tickets, and popular slots sell out days in advance.',
			'Our Paris tours include reserved entry, so you can skip the queue.',
		],
	},
	{
		author: 'yuki_sato',
		category: BoardArticleCategory.NEWS,
		title: 'Kyoto introduces measures against overtourism in Gion',
		image: 113,
		daysAgo: 12,
		content: [
			'Some private lanes in Gion are now closed to visitors. Please follow the signs and do not photograph geiko without permission.',
			'Early mornings remain the best time to explore respectfully.',
		],
	},
	{
		author: 'james_reid',
		category: BoardArticleCategory.NEWS,
		title: 'Grand Canyon: summer shuttle schedules and heat tips',
		image: 29,
		daysAgo: 17,
		content: [
			'Free park shuttles run along the South Rim and Hermit Road. Start hikes before 8 a.m. in summer.',
			'Carry at least 4 litres of water per person for any trail below the rim.',
		],
	},
	{
		author: 'aziz_travel',
		category: BoardArticleCategory.HUMOR,
		title: 'I ordered "a small coffee" in New York',
		image: 26,
		daysAgo: 2,
		content: [
			'It came in a cup the size of my head. I was awake until 3 a.m. and saw Times Square twice.',
			'10/10, would accidentally caffeinate again.',
		],
	},
	{
		author: 'tom_walker',
		category: BoardArticleCategory.HUMOR,
		title: 'The pigeon in Venice that stole my sandwich',
		image: 74,
		daysAgo: 5,
		content: [
			'It waited patiently, made eye contact, and took the whole thing. Not a crumb left.',
			'I respect the professionalism.',
		],
	},
	{
		author: 'hana_lee',
		category: BoardArticleCategory.HUMOR,
		title: 'Google Translate vs. a Tokyo menu',
		image: 41,
		daysAgo: 8,
		content: [
			'"Fried chicken with feelings" turned out to be karaage with a spicy mayo. The feelings were real.',
			'Pointing at pictures is still the best travel skill I have.',
		],
	},
	{
		author: 'laura_trips',
		category: BoardArticleCategory.HUMOR,
		title: 'Overpacked again: a confession',
		image: 20,
		daysAgo: 11,
		content: [
			'I wrote a carry-on guide last month and then checked a 23 kg suitcase for a 4-day trip.',
			'In my defence, the shoes were necessary. All six pairs.',
		],
	},
	{
		author: 'marco_b',
		category: BoardArticleCategory.HUMOR,
		title: 'My GPS tried to send me down Cinque Terre stairs',
		image: 60,
		daysAgo: 14,
		content: [
			'"Turn right" — into a staircase with 400 steps and a lemon tree. Ligurian roads are a different sport.',
			'Park at the top and take the train. Trust me.',
		],
	},
	{
		author: 'kenji_go',
		category: BoardArticleCategory.HUMOR,
		title: 'Jet lag diaries: I ate breakfast at 3 a.m. in London',
		image: 47,
		daysAgo: 19,
		content: [
			'Woke up wide awake, found a 24-hour café and had a full English breakfast while the city slept.',
			'By 3 p.m. I was asleep on a bench in Hyde Park. Classic.',
		],
	},
];

/* ------------------------------------------------------------------- notices */

type NoticeSeed = { category: NoticeCategory; title: string; content: string; daysAgo: number };

const NOTICES: NoticeSeed[] = [
	{
		category: NoticeCategory.FAQ,
		title: 'How do I book a tour on Velora?',
		content:
			'Open a tour, choose your date and number of travellers, then press "Book now". The agent confirms your booking and you can track it under My Bookings.',
		daysAgo: 30,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'When is my booking confirmed?',
		content:
			'Hotel stays and agent tours start as "Pending" and are confirmed by the hotel or agent, usually within 24 hours. You will see the status change in My Bookings.',
		daysAgo: 30,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'Which payment methods are accepted?',
		content:
			'We accept major credit and debit cards (Visa, Mastercard, UnionPay) and local cards such as Uzcard and Humo. Prices are shown in US dollars.',
		daysAgo: 29,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'Can I cancel or change my booking?',
		content:
			'Most tours can be cancelled free of charge up to 48 hours before departure. Hotel and car rental policies vary — check the details on each listing before booking.',
		daysAgo: 29,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'How do refunds work?',
		content:
			'Approved refunds are returned to the original payment method within 5–10 business days, depending on your bank.',
		daysAgo: 28,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'Do flight prices include baggage?',
		content:
			'Each flight listing shows the included baggage. Economy fares usually include one 23 kg checked bag; extra bags can be added with the airline.',
		daysAgo: 27,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'What do I need to rent a car?',
		content:
			"A valid driving licence held for at least one year, an international driving permit where required, and a credit card in the driver's name for the deposit.",
		daysAgo: 26,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'How do I contact my travel agent?',
		content:
			"Open the agent's profile from the Agents page. You can see their tours, read reviews and reach them through Velora support.",
		daysAgo: 25,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'Can I leave a review for an agent?',
		content:
			'Yes — after a confirmed tour with an agent, you can write a review on their profile page. Reviews help other travellers choose.',
		daysAgo: 24,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'I forgot my password. What should I do?',
		content:
			'Contact Velora support through the CS page with your username and phone number, and we will help you regain access to your account.',
		daysAgo: 23,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'Is travel insurance included?',
		content:
			'Insurance is not included by default. We strongly recommend buying a policy that covers medical expenses, cancellations and baggage delays.',
		daysAgo: 22,
	},
	{
		category: NoticeCategory.FAQ,
		title: 'Can I book for a group of more than 10 people?',
		content: 'Yes. For larger groups, contact the agent or Velora support for a tailored quote and private departures.',
		daysAgo: 21,
	},
	{
		category: NoticeCategory.NOTICE,
		title: 'Scheduled maintenance this weekend',
		content:
			'Velora will undergo scheduled maintenance on Sunday between 02:00 and 04:00 (UTC+5). Bookings may be briefly unavailable during this time.',
		daysAgo: 3,
	},
	{
		category: NoticeCategory.NOTICE,
		title: 'New: hotel stays and car rentals',
		content:
			'You can now book hotels and rent cars directly on Velora, alongside tours and flights. Find them in the search bar on the home page.',
		daysAgo: 10,
	},
	{
		category: NoticeCategory.NOTICE,
		title: 'Updated cancellation policy for tours',
		content:
			'From this month, most tours offer free cancellation up to 48 hours before departure. See each tour page for exact conditions.',
		daysAgo: 20,
	},
	{
		category: NoticeCategory.EVENT,
		title: 'Autumn sale: up to 20% off Asia tours',
		content:
			'Book selected tours in Japan, Korea, Bali and Thailand by the end of the month and save up to 20%. Discount is applied automatically at checkout.',
		daysAgo: 5,
	},
	{
		category: NoticeCategory.EVENT,
		title: 'Share your trip story and win a weekend getaway',
		content:
			'Post your best travel story in the Community with a photo. The most-liked post this month wins a two-night hotel stay.',
		daysAgo: 12,
	},
	{
		category: NoticeCategory.TERMS,
		title: 'Terms of Service',
		content:
			'By using Velora you agree to provide accurate booking information, follow the policies of each tour operator, hotel and airline, and respect other members in the Community. Full terms are available on request from Velora support.',
		daysAgo: 60,
	},
];

/* ------------------------------------------------------------------- reviews */

type ReviewSeed = { user: string; agent: string; tour: string; rating: number; text: string; daysAgo: number };

const REVIEWS: ReviewSeed[] = [
	{
		user: 'mia_wander',
		agent: 'sofia_rossi',
		tour: 'Santorini Sunset Escape',
		rating: 5,
		text: 'Sofia thought of everything — the cave suite and the sunset cruise were unforgettable.',
		daysAgo: 9,
	},
	{
		user: 'marco_b',
		agent: 'sofia_rossi',
		tour: 'Cinque Terre Coastal Hike',
		rating: 4,
		text: 'Great hiking pace and amazing food stops. One day was a bit rushed, but overall excellent.',
		daysAgo: 21,
	},
	{
		user: 'laura_trips',
		agent: 'lucas_martin',
		tour: 'Paris Classic Highlights',
		rating: 5,
		text: 'Lucas knows Paris inside out. The Louvre with an art historian was the highlight.',
		daysAgo: 6,
	},
	{
		user: 'aziz_travel',
		agent: 'lucas_martin',
		tour: 'Barcelona Gaudí & Tapas',
		rating: 5,
		text: 'Perfect mix of sightseeing and free time. The tapas crawl was so much fun.',
		daysAgo: 15,
	},
	{
		user: 'tom_walker',
		agent: 'emma_clarke',
		tour: 'Swiss Alps Scenic Rail',
		rating: 5,
		text: 'Flawless organisation, comfortable hotels and luggage transfers. Ideal for older travellers.',
		daysAgo: 8,
	},
	{
		user: 'kenji_go',
		agent: 'emma_clarke',
		tour: 'Iceland Northern Lights',
		rating: 4,
		text: 'We saw the aurora on the second night! Weather was tough, but Emma adjusted the plan quickly.',
		daysAgo: 25,
	},
	{
		user: 'hana_lee',
		agent: 'daniel_kim',
		tour: 'Seoul Palaces & Hanok Villages',
		rating: 5,
		text: 'Daniel was friendly and full of stories. Wearing hanbok in Gyeongbokgung was a dream.',
		daysAgo: 4,
	},
	{
		user: 'dilnoza_k',
		agent: 'daniel_kim',
		tour: 'Ha Long Bay Cruise',
		rating: 4,
		text: 'Beautiful cruise and great kayaking. Cabin was a little small but very clean.',
		daysAgo: 18,
	},
	{
		user: 'laura_trips',
		agent: 'yuki_sato',
		tour: 'Kyoto Temples & Tea Ceremony',
		rating: 5,
		text: 'Yuki planned a perfect itinerary. Fushimi Inari at sunrise without crowds — magical.',
		daysAgo: 5,
	},
	{
		user: 'hana_lee',
		agent: 'yuki_sato',
		tour: 'Bali Temples & Rice Terraces',
		rating: 5,
		text: 'Wonderful villa in Ubud and a great local guide. Would book again.',
		daysAgo: 12,
	},
	{
		user: 'mia_wander',
		agent: 'yuki_sato',
		tour: 'Tokyo Neon Nights',
		rating: 4,
		text: 'So much fun at night. teamLab was incredible. Mornings were a bit slow.',
		daysAgo: 30,
	},
	{
		user: 'aziz_travel',
		agent: 'omar_haddad',
		tour: 'Dubai Skyline & Desert Safari',
		rating: 5,
		text: 'Desert safari dinner under the stars was the best night of the trip.',
		daysAgo: 3,
	},
	{
		user: 'tom_walker',
		agent: 'omar_haddad',
		tour: 'Istanbul Two Continents',
		rating: 4,
		text: 'Very knowledgeable about history. The Bosphorus cruise was lovely.',
		daysAgo: 16,
	},
	{
		user: 'dilnoza_k',
		agent: 'nilufar_t',
		tour: 'Cappadocia Balloons & Caves',
		rating: 5,
		text: 'Balloon flight was cancelled once due to wind, but Nilufar rebooked us for the next morning. Perfect!',
		daysAgo: 7,
	},
	{
		user: 'tom_walker',
		agent: 'nilufar_t',
		tour: 'Kenya Safari Adventure',
		rating: 5,
		text: 'We saw the Great Migration river crossing. Everything was arranged perfectly.',
		daysAgo: 22,
	},
	{
		user: 'marco_b',
		agent: 'nilufar_t',
		tour: 'Nepal Himalaya Trek',
		rating: 4,
		text: 'Tough but rewarding trek with excellent porters and guides.',
		daysAgo: 35,
	},
	{
		user: 'kenji_go',
		agent: 'james_reid',
		tour: 'Grand Canyon Desert Road Trip',
		rating: 5,
		text: 'The road-trip notes James prepared were super detailed. Antelope Canyon was unreal.',
		daysAgo: 10,
	},
	{
		user: 'laura_trips',
		agent: 'james_reid',
		tour: 'New York City Explorer',
		rating: 4,
		text: 'Packed itinerary in the best way. Broadway seats were fantastic.',
		daysAgo: 27,
	},
];

/* ------------------------------------------------------------------- run */

const run = async (): Promise<void> => {
	await mongoose.connect(resolveMongoUri());
	const now = Date.now();

	const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
	const Tour = mongoose.models.Tour || mongoose.model('Tour', TourSchema);
	const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', HotelSchema);
	const Flight = mongoose.models.Flight || mongoose.model('Flight', FlightSchema);
	const Rentcar = mongoose.models.Rentcar || mongoose.model('Rentcar', RentcarSchema);
	const BoardArticle = mongoose.models.BoardArticle || mongoose.model('BoardArticle', BoardArticleSchema);
	const Notice = mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
	const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
	const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
	const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema);

	/** Validate + cast through the Mongoose schema, then keep our own timestamps. */
	const build = (
		Model: mongoose.Model<any>,
		doc: Record<string, unknown>,
		createdAt: Date,
	): Record<string, unknown> => {
		const instance = new Model(doc);
		const error = instance.validateSync();
		if (error) throw new Error(`${Model.modelName} validation failed: ${error.message}`);
		return { ...instance.toObject(), createdAt, updatedAt: createdAt };
	};

	/** Replace exactly the records this seed owns (matched by deterministic _id). */
	const replace = async (Model: mongoose.Model<any>, docs: Record<string, unknown>[]): Promise<void> => {
		if (DRY_RUN) return;
		const ids = docs.map((d) => d._id as Types.ObjectId);
		await Model.collection.deleteMany({ _id: { $in: ids } });
		if (docs.length) await Model.collection.insertMany(docs);
	};

	/* --- members: refuse to run if a nick/phone already belongs to someone else --- */
	const allMembers = [
		...AGENTS.map((m) => ({ ...m, type: MemberType.AGENT })),
		...USERS.map((m) => ({ ...m, type: MemberType.USER })),
	];
	const memberIds = new Map(allMembers.map((m) => [m.nick, demoId(`member:${m.nick}`)]));
	for (const m of allMembers) {
		const clash = await Member.findOne({
			$or: [{ memberNick: m.nick }, { memberPhone: m.phone }],
			_id: { $ne: memberIds.get(m.nick) },
		})
			.select('memberNick')
			.lean()
			.exec();
		if (clash) throw new Error(`Member nick/phone already taken by another account: ${m.nick} / ${m.phone}`);
	}

	const admin = (await Member.findOne({ memberType: MemberType.ADMIN }).select('_id').lean().exec()) as {
		_id: Types.ObjectId;
	} | null;
	if (!admin) throw new Error('No ADMIN member found — run `yarn seed:members` first (notices need an author).');

	const agentHash = await bcrypt.hash('Agent@12345', 10);
	const userHash = await bcrypt.hash('User@12345', 10);
	if (!DRY_RUN) {
		for (const m of allMembers) {
			const doc = build(
				Member,
				{
					_id: memberIds.get(m.nick),
					memberType: m.type,
					memberStatus: MemberStatus.ACTIVE,
					memberAuthType: MemberAuthType.PHONE,
					memberPhone: m.phone,
					memberNick: m.nick,
					memberPassword: m.type === MemberType.AGENT ? agentHash : userHash,
					memberFullName: m.fullName,
					memberImage: img(m.image),
					memberAddress: m.address,
					memberDesc: m.desc,
					memberViews: pick(`views:${m.nick}`, 40, 900),
				},
				new Date(now - pick(`joined:${m.nick}`, 60, 400) * DAY),
			);
			const { _id, createdAt, ...rest } = doc;
			// Upsert so likes/follows other people made on these members survive a re-run.
			await Member.collection.updateOne(
				{ _id: _id as Types.ObjectId },
				{ $set: rest, $setOnInsert: { createdAt } },
				{ upsert: true },
			);
		}
	}
	const memberId = (nick: string): Types.ObjectId => {
		const id = memberIds.get(nick);
		if (!id) throw new Error(`Unknown demo member: ${nick}`);
		return id;
	};

	/* --- tours --- */
	const tourIds = new Map<string, Types.ObjectId>();
	const tourDocs = TOURS.map((t, i) => {
		const _id = demoId(`tour:${slug(t.title)}`);
		tourIds.set(t.title, _id);
		return build(
			Tour,
			{
				_id,
				tourTitle: t.title,
				tourLocation: t.location,
				tourDays: t.days,
				tourNights: Math.max(t.days - 1, 0),
				tourPrice: t.price,
				tourImages: t.images.map(img),
				tourDesc: t.desc,
				tourStatus: TourStatus.ACTIVE,
				tourSoldCount: t.sold,
				tourViews: t.sold * 7 + pick(`tv:${t.title}`, 10, 120),
				memberId: memberId(t.agent),
			},
			new Date(now - (i + 1) * 2 * DAY),
		);
	});
	await replace(Tour, tourDocs);

	/* --- hotels --- */
	const hotelDocs = HOTELS.map((h, i) =>
		build(
			Hotel,
			{
				_id: demoId(`hotel:${slug(h.name)}`),
				hotelName: h.name,
				hotelLocation: h.location,
				hotelAddress: h.address,
				hotelPrice: h.price,
				hotelStars: h.stars,
				availableRooms: pick(`rooms:${h.name}`, 4, 40),
				hotelImages: h.images.map(img),
				hotelDesc: h.desc,
				hotelStatus: HotelStatus.ACTIVE,
				hotelViews: pick(`hv:${h.name}`, 80, 1500),
			},
			new Date(now - (i + 1) * 3 * DAY),
		),
	);
	await replace(Hotel, hotelDocs);

	/* --- rentcars --- */
	const rentcarDocs = RENTCARS.map((c, i) =>
		build(
			Rentcar,
			{
				_id: demoId(`rentcar:${slug(c.title)}:${slug(c.location)}`),
				carTitle: c.title,
				carLocation: c.location,
				carCategory: c.category,
				transmission: c.transmission,
				seats: c.seats,
				dailyPrice: c.price,
				availableCars: pick(`cars:${c.title}`, 1, 8),
				carImages: c.images.map(img),
				carDesc: c.desc,
				rentcarStatus: RentcarStatus.ACTIVE,
				rentcarViews: pick(`cv:${c.title}`, 30, 800),
			},
			new Date(now - (i + 1) * 3 * DAY),
		),
	);
	await replace(Rentcar, rentcarDocs);

	/* --- flights: always in the future relative to the run date --- */
	const today = new Date(now);
	today.setUTCHours(0, 0, 0, 0);
	const flightDocs = FLIGHTS.map((f, i) => {
		const departure = new Date(today.getTime() + (3 + ((i * 5) % 50)) * DAY + (6 + ((i * 7) % 16)) * HOUR);
		return build(
			Flight,
			{
				_id: demoId(`flight:${f.number}:${f.cabin}`),
				airline: f.airline,
				flightNumber: f.number,
				departureAirport: f.from,
				arrivalAirport: f.to,
				departureTime: departure,
				arrivalTime: new Date(departure.getTime() + f.hours * HOUR),
				cabinClass: f.cabin,
				availableSeats: pick(`seats:${f.number}`, 6, 60),
				basePrice: f.price,
				flightStatus: FlightStatus.ACTIVE,
			},
			new Date(now - (i + 1) * DAY),
		);
	});
	await replace(Flight, flightDocs);

	/* --- community articles + likes from demo users --- */
	const userNicks = USERS.map((u) => u.nick);
	const likeDocs: Record<string, unknown>[] = [];
	const articleDocs = ARTICLES.map((a) => {
		const _id = demoId(`article:${slug(a.title)}`);
		const likers = userNicks.filter((nick) => nick !== a.author && pick(`like:${a.title}:${nick}`, 0, 99) < 45);
		const createdAt = new Date(now - a.daysAgo * DAY - pick(`at:${a.title}`, 1, 20) * HOUR);
		for (const nick of likers) {
			likeDocs.push(
				build(
					Like,
					{
						_id: demoId(`like:article:${slug(a.title)}:${nick}`),
						likeGroup: LikeGroup.ARTICLE,
						likeRefId: _id,
						memberId: memberId(nick),
					},
					createdAt,
				),
			);
		}
		return build(
			BoardArticle,
			{
				_id,
				articleCategory: a.category,
				articleStatus: BoardArticleStatus.ACTIVE,
				articleTitle: a.title,
				articleContent: a.content.map((p) => `<p>${p}</p>`).join(''),
				articleImage: a.image ? img(a.image) : undefined,
				articleLikes: likers.length,
				articleViews: likers.length * 9 + pick(`av:${a.title}`, 12, 260),
				memberId: memberId(a.author),
			},
			createdAt,
		);
	});
	await replace(BoardArticle, articleDocs);

	/* --- agent likes from demo users --- */
	for (const agent of AGENTS) {
		for (const nick of userNicks) {
			if (pick(`agentlike:${agent.nick}:${nick}`, 0, 99) >= 40) continue;
			likeDocs.push(
				build(
					Like,
					{
						_id: demoId(`like:member:${agent.nick}:${nick}`),
						likeGroup: LikeGroup.MEMBER,
						likeRefId: memberId(agent.nick),
						memberId: memberId(nick),
					},
					new Date(now - pick(`al:${agent.nick}:${nick}`, 1, 60) * DAY),
				),
			);
		}
	}
	await replace(Like, likeDocs);

	/* --- notices (FAQ / NOTICE / EVENT / TERMS) authored by the admin --- */
	const noticeDocs = NOTICES.map((n) =>
		build(
			Notice,
			{
				_id: demoId(`notice:${n.category}:${slug(n.title)}`),
				noticeCategory: n.category,
				noticeStatus: NoticeStatus.ACTIVE,
				noticeTitle: n.title,
				noticeContent: n.content,
				memberId: admin._id,
			},
			new Date(now - n.daysAgo * DAY),
		),
	);
	await replace(Notice, noticeDocs);

	/* --- agent reviews, each backed by the confirmed tour booking the API requires --- */
	const bookingDocs: Record<string, unknown>[] = [];
	const commentDocs = REVIEWS.map((r) => {
		const tour = TOURS.find((t) => t.title === r.tour && t.agent === r.agent);
		const tourId = tourIds.get(r.tour);
		if (!tour || !tourId) throw new Error(`Review references unknown tour for ${r.agent}: ${r.tour}`);
		const reviewedAt = new Date(now - r.daysAgo * DAY);
		bookingDocs.push(
			build(
				Booking,
				{
					_id: demoId(`booking:${r.user}:${slug(r.tour)}`),
					bookingType: BookingType.TOUR,
					bookingStatus: BookingStatus.CONFIRMED,
					bookingRefId: tourId,
					memberId: memberId(r.user),
					agentId: memberId(r.agent),
					bookingTitle: r.tour,
					bookingPrice: tour.price,
					quantity: 1,
				},
				new Date(reviewedAt.getTime() - (tour.days + 14) * DAY),
			),
		);
		return build(
			Comment,
			{
				_id: demoId(`review:${r.user}:${r.agent}:${slug(r.tour)}`),
				commentStatus: CommentStatus.ACTIVE,
				commentGroup: CommentGroup.MEMBER,
				commentContent: r.text,
				commentRating: r.rating,
				commentRefId: memberId(r.agent),
				memberId: memberId(r.user),
			},
			reviewedAt,
		);
	});
	await replace(Booking, bookingDocs);
	await replace(Comment, commentDocs);

	/* --- keep member counters consistent with the real documents --- */
	if (!DRY_RUN) {
		for (const m of allMembers) {
			const id = memberId(m.nick);
			const [articles, likes, comments] = await Promise.all([
				BoardArticle.collection.countDocuments({ memberId: id, articleStatus: BoardArticleStatus.ACTIVE }),
				Like.collection.countDocuments({ likeRefId: id, likeGroup: LikeGroup.MEMBER }),
				Comment.collection.countDocuments({ commentRefId: id, commentStatus: CommentStatus.ACTIVE }),
			]);
			await Member.collection.updateOne(
				{ _id: id },
				{ $set: { memberArticles: articles, memberLikes: likes, memberComments: comments } },
			);
		}
	}

	console.log(
		`${DRY_RUN ? '[dry-run] validated' : 'Seeded'}: ${AGENTS.length} agents, ${USERS.length} users, ` +
			`${tourDocs.length} tours, ${hotelDocs.length} hotels, ${rentcarDocs.length} rentcars, ` +
			`${flightDocs.length} flights, ${articleDocs.length} articles, ${likeDocs.length} likes, ` +
			`${noticeDocs.length} notices, ${commentDocs.length} reviews, ${bookingDocs.length} bookings`,
	);
	await mongoose.disconnect();
};

/* Unsplash photo ids by contact-sheet index (each verified to return HTTP 200). */
const IMAGES: Record<number, string> = {
	216: '1531427186611-ecfd6d936c79',
	2: '1436491865332-7a61a109cc05',
	5: '1445019980597-93fa8acb246c',
	6: '1449034446853-66c86144b0ad',
	7: '1454496522488-7a8e488e8606',
	8: '1455587734955-081b22074882',
	9: '1463453091185-61582044d556',
	12: '1469854523086-cc02fe5d8800',
	14: '1472099645785-5658abf4ff4e',
	16: '1476514525535-07fb3b4ae5f1',
	17: '1485871981521-5b1fd3805eee',
	19: '1488426862026-3ee34a7d66df',
	20: '1488646953014-85cb44e25828',
	21: '1489493585363-d69421e0edd3',
	22: '1492144534655-ae79c964c9d7',
	23: '1493976040374-85c8e12f0c0e',
	24: '1494790108377-be9c29b29330',
	25: '1494976388531-d1058494cdd8',
	26: '1496442226666-8d4d0e62e6e9',
	27: '1498503182468-3b51cbb6cb24',
	28: '1499856871958-5b9627545d1a',
	29: '1500530855697-b586d89ba3ee',
	30: '1500648767791-00dcc994a43e',
	32: '1500917293891-ef795e70e1f6',
	33: '1501555088652-021faa106b9b',
	34: '1501594907352-04cda38ebc29',
	35: '1501785888041-af3ef285b470',
	36: '1502602898657-3e91760cbb34',
	37: '1502877338535-766e1452684a',
	39: '1503376780353-7e6692767b70',
	40: '1503736334956-4c8f8e92946d',
	41: '1503899036084-c55cdd92da26',
	43: '1504609773096-104ff2c73ba4',
	44: '1504674900247-0877df9cc836',
	47: '1505761671935-60b3a7427bad',
	48: '1506794778202-cad84cf45f1d',
	49: '1506905925346-21bda4d32df4',
	50: '1506929562872-bb421503ef21',
	51: '1506973035872-a4ec16b8e8d9',
	52: '1507003211169-0a1dd7228f2d',
	54: '1508009603885-50cf7c579365',
	55: '1511919884226-fd3cad34687c',
	56: '1512453979798-5ea266f8880c',
	57: '1513635269975-59663e0ac1ad',
	58: '1514282401047-d79a71a590e8',
	59: '1516426122078-c23e76319801',
	60: '1516483638261-f4dbaf036963',
	61: '1517154421773-0529f29ea451',
	64: '1517760444937-f6397edcbbcd',
	65: '1517841905240-472988babdf9',
	66: '1518684079-3c830dcef090',
	67: '1519046904884-53103b34b206',
	68: '1519085360753-af0119f7cbe7',
	69: '1519641471654-76ce0107ad1b',
	70: '1520250497591-112f2f40a3f4',
	71: '1520939817895-060bdaf4fe1b',
	73: '1523482580672-f109ba8cb9be',
	74: '1523906834658-6e24ef2386f9',
	75: '1524231757912-21f4fe3a7200',
	78: '1527631746610-bca00a040d60',
	79: '1527668752968-14dc70a27c95',
	80: '1527838832700-5059252407fa',
	81: '1527980965255-d3b416303d12',
	82: '1528127269322-539801943592',
	83: '1528181304800-259b08848526',
	86: '1529655683826-aba9b3e77383',
	88: '1530789253388-582c481c54b0',
	89: '1531123897727-8f129e1688ce',
	90: '1531366936337-7c912a4589a7',
	91: '1533105079780-92b9be482077',
	92: '1533473359331-0135ef1b58bf',
	93: '1534274867514-d5b47ef89ed7',
	94: '1534351590666-13e3e96b5017',
	95: '1534430480872-3498386e7856',
	96: '1534528741775-53994a69daeb',
	97: '1535189043414-47a3c49a0bed',
	98: '1537953773345-d172ccf13cf1',
	99: '1537996194471-e657df975ab4',
	100: '1538485399081-7191377e8241',
	101: '1539020140153-e479b8c22e70',
	103: '1539571696357-5a69c17a67c6',
	105: '1540959733332-eab4deabeeaf',
	106: '1541432901042-2d8bd64b4a9b',
	107: '1541899481282-d53bffe3c35d',
	108: '1542314831-068cd1dbfeeb',
	109: '1542362567-b07e54358753',
	110: '1544005313-94ddf0286df2',
	112: '1544735716-392fe2489ffa',
	113: '1545569341-9eb8b30979d9',
	114: '1547471080-7cc2caa01a7e',
	115: '1549294413-26f195200c16',
	116: '1549317661-bd32c8ce0db2',
	118: '1551632811-561732d1e306',
	119: '1551867633-194f125bddfa',
	120: '1551882547-ff40c63fe5fa',
	121: '1551918120-9739cb430c6d',
	122: '1552519507-da3b142c6e3d',
	123: '1552832230-c0197dd311b5',
	124: '1555215695-3004980ad54e',
	125: '1555400038-63f5ba517a47',
	127: '1560958089-b8a1929cea89',
	128: '1561501900-3701fa6a0864',
	129: '1563911302283-d2bc129e7570',
	130: '1564501049412-61c2a3083791',
	131: '1565967511849-76a60a516170',
	132: '1566073771259-6a8506099945',
	133: '1568084680786-a84f91d1153c',
	134: '1570077188670-e3a8d69ac5ff',
	135: '1571896349842-33c89424de2d',
	136: '1573843981267-be1999ff37cd',
	137: '1578683010236-d716f9a3f461',
	138: '1580273916550-e323be2ae537',
	139: '1580274455191-1c62238fa333',
	140: '1580489944761-15a19d654956',
	141: '1580502304784-8985b7eb7260',
	142: '1582719478250-c89cae4dc85b',
	144: '1583422409516-2895a77efded',
	145: '1584132967334-10e028bd69f7',
	146: '1587213811864-46e59f6873b1',
	147: '1590490360182-c33d57733427',
	148: '1595576508898-0ad5c879a061',
	149: '1596394516093-501ba68a0ba6',
	150: '1601654253194-260e0b6984f9',
	151: '1606664515524-ed2f786a0bd6',
	152: '1609521263047-f8f205293f24',
	153: '1611892440504-42a792e24d32',
	155: '1618773928121-c32242e63f39',
	156: '1619767886558-efdc259cde1a',
};

run().catch(async (error) => {
	console.error('Demo content seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
