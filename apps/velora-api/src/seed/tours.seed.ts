import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import MemberSchema from '../schemas/Member.model';
import TourSchema from '../schemas/Tour.model';
import { MemberAuthType, MemberStatus, MemberType } from '../libs/enums/member.enum';
import { TourStatus } from '../libs/enums/tour.enum';

type AgentSeed = {
	memberNick: string;
	memberPhone: string;
	memberFullName: string;
	memberImage: string;
};

type TourSeed = {
	tourTitle: string;
	tourLocation: string;
	tourDays: number;
	tourPrice: number;
	tourImages: string[];
	agentNick: string;
	tourSoldCount: number;
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

const agentSeeds: AgentSeed[] = [
	{
		memberNick: 'velora_agent_seoul',
		memberPhone: '+998770000101',
		memberFullName: 'Min-Jun Park',
		memberImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
	},
	{
		memberNick: 'velora_agent_tokyo',
		memberPhone: '+998770000102',
		memberFullName: 'Aiko Tanaka',
		memberImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
	},
	{
		memberNick: 'velora_agent_tashkent',
		memberPhone: '+998770000103',
		memberFullName: 'Shahzod Karimov',
		memberImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
	},
	{
		memberNick: 'velora_agent_dubai',
		memberPhone: '+998770000104',
		memberFullName: 'Laila Al Mansoori',
		memberImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
	},
];

const tourSeeds: TourSeed[] = [
	{
		tourTitle: 'VELORA Seed: Seoul City Lights',
		tourLocation: 'Seoul',
		tourDays: 4,
		tourPrice: 420,
		tourImages: ['https://images.unsplash.com/photo-1535189043414-47a3c49a0bed?w=1200'],
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 94,
	},
	{
		tourTitle: 'VELORA Seed: Seoul Food & Culture Weekend',
		tourLocation: 'Seoul',
		tourDays: 3,
		tourPrice: 310,
		tourImages: ['https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=1200'],
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 61,
	},
	{
		tourTitle: 'VELORA Seed: Tokyo Modern Explorer',
		tourLocation: 'Tokyo',
		tourDays: 5,
		tourPrice: 690,
		tourImages: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200'],
		agentNick: 'velora_agent_tokyo',
		tourSoldCount: 88,
	},
	{
		tourTitle: 'VELORA Seed: Tokyo Anime Streets',
		tourLocation: 'Tokyo',
		tourDays: 3,
		tourPrice: 370,
		tourImages: ['https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200'],
		agentNick: 'velora_agent_tokyo',
		tourSoldCount: 73,
	},
	{
		tourTitle: 'VELORA Seed: Tashkent Heritage Highlights',
		tourLocation: 'Tashkent',
		tourDays: 2,
		tourPrice: 180,
		tourImages: ['https://images.unsplash.com/photo-1706264469965-31fd50be5dfc?w=1200'],
		agentNick: 'velora_agent_tashkent',
		tourSoldCount: 120,
	},
	{
		tourTitle: 'VELORA Seed: Samarkand & Tashkent Combo',
		tourLocation: 'Tashkent',
		tourDays: 5,
		tourPrice: 520,
		tourImages: ['https://images.unsplash.com/photo-1601654253194-260e0b6984f9?w=1200'],
		agentNick: 'velora_agent_tashkent',
		tourSoldCount: 49,
	},
	{
		tourTitle: 'VELORA Seed: Dubai Desert Adventure',
		tourLocation: 'Dubai',
		tourDays: 3,
		tourPrice: 460,
		tourImages: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200'],
		agentNick: 'velora_agent_dubai',
		tourSoldCount: 115,
	},
	{
		tourTitle: 'VELORA Seed: Dubai Luxury Escape',
		tourLocation: 'Dubai',
		tourDays: 4,
		tourPrice: 980,
		tourImages: ['https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200'],
		agentNick: 'velora_agent_dubai',
		tourSoldCount: 42,
	},
	{
		tourTitle: 'VELORA Seed: Bangkok Street Life Tour',
		tourLocation: 'Bangkok',
		tourDays: 4,
		tourPrice: 340,
		tourImages: ['https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200'],
		agentNick: 'velora_agent_tokyo',
		tourSoldCount: 85,
	},
	{
		tourTitle: 'VELORA Seed: Istanbul Bosphorus Journey',
		tourLocation: 'Istanbul',
		tourDays: 4,
		tourPrice: 430,
		tourImages: ['https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200'],
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 67,
	},
	{
		tourTitle: 'VELORA Seed: Paris Art & Café Days',
		tourLocation: 'Paris',
		tourDays: 5,
		tourPrice: 860,
		tourImages: ['https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200'],
		agentNick: 'velora_agent_dubai',
		tourSoldCount: 39,
	},
	{
		tourTitle: 'VELORA Seed: Cappadocia Balloon Morning',
		tourLocation: 'Cappadocia',
		tourDays: 2,
		tourPrice: 390,
		tourImages: ['https://images.unsplash.com/photo-1645027820616-64fba26489ee?w=1200'],
		agentNick: 'velora_agent_seoul',
		tourSoldCount: 76,
	},
];

const ensureAgents = async (memberModel: mongoose.Model<any>): Promise<Map<string, Types.ObjectId>> => {
	const passwordHash = await bcrypt.hash('Agent@12345', 10);
	const agentMap = new Map<string, Types.ObjectId>();

	for (const agent of agentSeeds) {
		const existing = (await memberModel.findOne({ memberNick: agent.memberNick }).select('_id').lean().exec()) as {
			_id?: Types.ObjectId;
		} | null;
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
			memberFullName: agent.memberFullName,
			memberImage: agent.memberImage,
			memberDesc: 'Velora seeded travel expert profile',
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

	const agentIds = await ensureAgents(MemberModel);
	const tourDocs = tourSeeds.map((tour) => {
		const agentId = agentIds.get(tour.agentNick);
		if (!agentId) throw new Error(`Agent not found for seed: ${tour.agentNick}`);

		return {
			tourTitle: tour.tourTitle,
			tourLocation: tour.tourLocation,
			tourDays: tour.tourDays,
			tourNights: Math.max(tour.tourDays - 1, 0),
			tourPrice: tour.tourPrice,
			tourImages: tour.tourImages,
			tourDesc: `${tour.tourLocation} curated package by ${tour.agentNick}`,
			tourStatus: TourStatus.ACTIVE,
			tourSoldCount: tour.tourSoldCount,
			memberId: agentId,
		};
	});

	await TourModel.deleteMany({ tourTitle: { $regex: /^VELORA Seed:/ } });
	await TourModel.insertMany(tourDocs);

	console.log(`Seed completed: inserted ${tourDocs.length} tours`);
	await mongoose.disconnect();
};

seedTours().catch(async (error) => {
	console.error('Tours seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
