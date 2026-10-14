import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import MemberSchema from '../schemas/Member.model';
import TourSchema from '../schemas/Tour.model';
import BookingSchema from '../schemas/Booking.model';
import { MemberAuthType, MemberStatus, MemberType } from '../libs/enums/member.enum';
import { TourStatus } from '../libs/enums/tour.enum';

type AgentSeed = {
	memberNick: string;
	memberPhone: string;
	memberFullName: string;
	memberImage: string;
	memberAddress: string;
	memberDesc: string;
};

type TourSeed = {
	tourTitle: string;
	tourLocation: string;
	tourDays: number;
	tourPrice: number;
	tourImages: string[];
	tourDesc: string;
	agentNick: string;
	tourSoldCount: number;
};

/** Titles used to carry a "VELORA Seed: " prefix; older databases still have them. */
const LEGACY_TITLE_PREFIX = 'VELORA Seed: ';

const photo = (id: string): string => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

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

const agentSeeds: AgentSeed[] = [
	{
		memberNick: 'velora_agent_seoul',
		memberPhone: '+998770000101',
		memberFullName: 'Min-Jun Park',
		memberImage: photo('photo-1542909168-82c3e7fdca5c'),
		memberAddress: 'Seoul',
		memberDesc: 'Seoul-based guide for city lights, Korean food culture and weekend escapes across Asia and Türkiye.',
	},
	{
		memberNick: 'velora_agent_tokyo',
		memberPhone: '+998770000102',
		memberFullName: 'Aiko Tanaka',
		memberImage: photo('photo-1487412720507-e7ab37603c6f'),
		memberAddress: 'Tokyo',
		memberDesc: 'Tokyo local who loves modern architecture, anime districts and Southeast Asian street food.',
	},
	{
		memberNick: 'velora_agent_tashkent',
		memberPhone: '+998770000103',
		memberFullName: 'Shahzod Karimov',
		memberImage: photo('photo-1507003211169-0a1dd7228f2d'),
		memberAddress: 'Tashkent',
		memberDesc: 'Silk Road specialist — Tashkent, Samarkand and Bukhara with licensed local historians.',
	},
	{
		memberNick: 'velora_agent_dubai',
		memberPhone: '+998770000104',
		memberFullName: 'Laila Al Mansoori',
		memberImage: photo('photo-1438761681033-6461ffad8d80'),
		memberAddress: 'Dubai',
		memberDesc: 'Dubai luxury and desert experiences, plus art-filled city breaks in Paris.',
	},
];

const tourSeeds: TourSeed[] = [
	{
		tourTitle: 'Seoul City Lights',
		tourLocation: 'Seoul',
		tourDays: 4,
		tourPrice: 420,
		tourImages: [photo('photo-1534274867514-d5b47ef89ed7'), photo('photo-1538485399081-7191377e8241')],
		tourDesc:
			'Seoul after dark: Lotte World Tower at sunset, the neon lanes of Myeongdong and Hongdae, a Han River night cruise and Namsan Tower views.',
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 94,
	},
	{
		tourTitle: 'Seoul Food & Culture Weekend',
		tourLocation: 'Seoul',
		tourDays: 3,
		tourPrice: 310,
		tourImages: [photo('photo-1504674900247-0877df9cc836'), photo('photo-1517154421773-0529f29ea451')],
		tourDesc:
			'Gwangjang Market tasting, a kimchi-making class, temple food in Insadong and a Korean BBQ dinner with local friends.',
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 61,
	},
	{
		tourTitle: 'Tokyo Modern Explorer',
		tourLocation: 'Tokyo',
		tourDays: 5,
		tourPrice: 690,
		tourImages: [photo('photo-1540959733332-eab4deabeeaf'), photo('photo-1528164344705-47542687000d')],
		tourDesc:
			'Shibuya and Shinjuku, Tokyo Skytree, teamLab and a day trip to the Chureito Pagoda for Mount Fuji views.',
		agentNick: 'velora_agent_tokyo',
		tourSoldCount: 88,
	},
	{
		tourTitle: 'Tokyo Anime Streets',
		tourLocation: 'Tokyo',
		tourDays: 3,
		tourPrice: 370,
		tourImages: [photo('photo-1503899036084-c55cdd92da26'), photo('photo-1596463059283-da257325bab8')],
		tourDesc:
			'Akihabara arcades and figure shops, Nakano Broadway, the Ghibli Museum and a themed café lunch with bento.',
		agentNick: 'velora_agent_tokyo',
		tourSoldCount: 73,
	},
	{
		tourTitle: 'Tashkent Heritage Highlights',
		tourLocation: 'Tashkent',
		tourDays: 2,
		tourPrice: 180,
		tourImages: [
			photo('photo-1654861857666-1e8c438cbe4a'),
			photo('photo-1681026865516-350603a4ba5b'),
			photo('photo-1622030797403-fa221ce5d208'),
		],
		tourDesc:
			'Hazrati Imam complex, Chorsu Bazaar, the ornate Tashkent metro stations and a plov lunch at the Central Asian Plov Centre.',
		agentNick: 'velora_agent_tashkent',
		tourSoldCount: 120,
	},
	{
		tourTitle: 'Samarkand & Tashkent Combo',
		tourLocation: 'Tashkent',
		tourDays: 5,
		tourPrice: 520,
		tourImages: [
			photo('photo-1733586092622-1b3201e802a5'),
			photo('photo-1664602078796-68ee76b3fc59'),
			photo('photo-1719143648737-585bf80a5bdf'),
		],
		tourDesc:
			'High-speed Afrosiyob train to Samarkand: the Registan by day and by night, Shah-i-Zinda and Gur-e-Amir, then two days in Tashkent.',
		agentNick: 'velora_agent_tashkent',
		tourSoldCount: 49,
	},
	{
		tourTitle: 'Dubai Desert Adventure',
		tourLocation: 'Dubai',
		tourDays: 3,
		tourPrice: 460,
		tourImages: [photo('photo-1489493585363-d69421e0edd3'), photo('photo-1512453979798-5ea266f8880c')],
		tourDesc: 'Dune bashing in a 4x4, a camel ride at sunset, sandboarding and a Bedouin camp dinner under the stars.',
		agentNick: 'velora_agent_dubai',
		tourSoldCount: 115,
	},
	{
		tourTitle: 'Dubai Luxury Escape',
		tourLocation: 'Dubai',
		tourDays: 4,
		tourPrice: 980,
		tourImages: [photo('photo-1518684079-3c830dcef090'), photo('photo-1584551246679-0daf3d275d0f')],
		tourDesc:
			'Five-star beach resort, brunch at the Burj Al Arab, a yacht cruise along the Marina and a day trip to the Sheikh Zayed Grand Mosque.',
		agentNick: 'velora_agent_dubai',
		tourSoldCount: 42,
	},
	{
		tourTitle: 'Bangkok Street Life Tour',
		tourLocation: 'Bangkok',
		tourDays: 4,
		tourPrice: 340,
		tourImages: [photo('photo-1508009603885-50cf7c579365'), photo('photo-1528181304800-259b08848526')],
		tourDesc:
			'Tuk-tuk ride through Chinatown, floating markets, the Grand Palace and Wat Arun, and a night food crawl on Yaowarat Road.',
		agentNick: 'velora_agent_tokyo',
		tourSoldCount: 85,
	},
	{
		tourTitle: 'Istanbul Bosphorus Journey',
		tourLocation: 'Istanbul',
		tourDays: 4,
		tourPrice: 430,
		tourImages: [photo('photo-1524231757912-21f4fe3a7200'), photo('photo-1527838832700-5059252407fa')],
		tourDesc:
			'Bosphorus cruise between two continents, Galata Tower, the Spice Bazaar and a Turkish bath in a 16th-century hammam.',
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 67,
	},
	{
		tourTitle: 'Paris Art & Café Days',
		tourLocation: 'Paris',
		tourDays: 5,
		tourPrice: 860,
		tourImages: [photo('photo-1499856871958-5b9627545d1a'), photo('photo-1570939274717-7eda259b50ed')],
		tourDesc:
			"Musée d'Orsay and Orangerie, Montmartre artists' square, a pastry class and slow mornings in Saint-Germain cafés.",
		agentNick: 'velora_agent_dubai',
		tourSoldCount: 39,
	},
	{
		tourTitle: 'Cappadocia Balloon Morning',
		tourLocation: 'Cappadocia',
		tourDays: 2,
		tourPrice: 390,
		tourImages: [photo('photo-1641128324972-af3212f0f6bd')],
		tourDesc: 'Sunrise hot-air balloon flight over the fairy chimneys, Göreme valley hike and a night in a cave hotel.',
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 76,
	},
];

/** Create missing agents and keep the profile of existing ones up to date (password is never touched). */
const ensureAgents = async (memberModel: mongoose.Model<any>): Promise<Map<string, Types.ObjectId>> => {
	const passwordHash = await bcrypt.hash('Agent@12345', 10);
	const agentMap = new Map<string, Types.ObjectId>();

	for (const agent of agentSeeds) {
		const profile = {
			memberFullName: agent.memberFullName,
			memberImage: agent.memberImage,
			memberAddress: agent.memberAddress,
			memberDesc: agent.memberDesc,
		};
		const existing = (await memberModel
			.findOneAndUpdate({ memberNick: agent.memberNick }, { $set: profile }, { new: true })
			.select('_id')
			.lean()
			.exec()) as { _id?: Types.ObjectId } | null;
		if (existing?._id) {
			agentMap.set(agent.memberNick, existing._id);
			continue;
		}

		const created = await memberModel.create({
			memberType: MemberType.AGENT,
			memberStatus: MemberStatus.ACTIVE,
			memberAuthType: MemberAuthType.PHONE,
			memberPhone: agent.memberPhone,
			memberNick: agent.memberNick,
			memberPassword: passwordHash,
			...profile,
		});

		agentMap.set(agent.memberNick, created._id as Types.ObjectId);
	}

	return agentMap;
};

const seedTours = async (): Promise<void> => {
	const mongoUri = resolveMongoUri();
	await mongoose.connect(mongoUri);

	const MemberModel = mongoose.models.Member || mongoose.model('Member', MemberSchema);
	const TourModel = mongoose.models.Tour || mongoose.model('Tour', TourSchema);
	const BookingModel = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

	const agentIds = await ensureAgents(MemberModel);
	let created = 0;
	let updated = 0;

	for (const tour of tourSeeds) {
		const agentId = agentIds.get(tour.agentNick);
		if (!agentId) throw new Error(`Agent not found for seed: ${tour.agentNick}`);

		const legacyTitle = `${LEGACY_TITLE_PREFIX}${tour.tourTitle}`;
		const fields = {
			tourTitle: tour.tourTitle,
			tourLocation: tour.tourLocation,
			tourDays: tour.tourDays,
			tourNights: Math.max(tour.tourDays - 1, 0),
			tourPrice: tour.tourPrice,
			tourImages: tour.tourImages,
			tourDesc: tour.tourDesc,
			tourStatus: TourStatus.ACTIVE,
			memberId: agentId,
		};

		// Update in place (same _id) so bookings, likes and views on the tour stay attached.
		const existing = (await TourModel.findOne({
			memberId: agentId,
			tourTitle: { $in: [tour.tourTitle, legacyTitle] },
		})
			.select('_id')
			.lean()
			.exec()) as { _id: Types.ObjectId } | null;

		if (existing) {
			await TourModel.updateOne({ _id: existing._id }, { $set: fields }).exec();
			// Booking titles are a snapshot of the tour title; drop the legacy prefix there too.
			await BookingModel.updateMany(
				{ bookingRefId: existing._id, bookingTitle: legacyTitle },
				{ $set: { bookingTitle: tour.tourTitle } },
			).exec();
			updated += 1;
		} else {
			await TourModel.create({ ...fields, tourSoldCount: tour.tourSoldCount });
			created += 1;
		}
	}

	console.log(`Seed completed: ${updated} tours updated, ${created} tours created`);
	await mongoose.disconnect();
};

seedTours().catch(async (error) => {
	console.error('Tours seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
