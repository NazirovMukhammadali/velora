import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import MemberSchema from '../schemas/Member.model';
import { MemberAuthType, MemberStatus, MemberType } from '../libs/enums/member.enum';

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

/** Velora admin — can create hotels, flights, rentcars via GraphQL admin mutations. */
const ADMIN_SEED = {
	memberNick: 'velora_admin',
	memberPhone: '+998770000001',
	memberFullName: 'Velora Admin',
	memberPassword: 'Admin@12345',
};

const seedMembers = async (): Promise<void> => {
	const mongoUri = resolveMongoUri();
	await mongoose.connect(mongoUri);

	const MemberModel = mongoose.models.Member || mongoose.model('Member', MemberSchema);
	const passwordHash = await bcrypt.hash(ADMIN_SEED.memberPassword, 10);

	const existing = await MemberModel.findOne({ memberNick: ADMIN_SEED.memberNick }).select('_id').lean().exec();
	if (existing) {
		console.log('Admin already exists — skipped');
	} else {
		await MemberModel.create({
			memberType: MemberType.ADMIN,
			memberStatus: MemberStatus.ACTIVE,
			memberAuthType: MemberAuthType.PHONE,
			memberPhone: ADMIN_SEED.memberPhone,
			memberNick: ADMIN_SEED.memberNick,
			memberPassword: passwordHash,
			memberFullName: ADMIN_SEED.memberFullName,
			memberDesc: 'Velora platform administrator',
		});
		console.log(`Admin created: ${ADMIN_SEED.memberNick} / ${ADMIN_SEED.memberPassword}`);
	}

	await mongoose.disconnect();
};

seedMembers().catch(async (error) => {
	console.error('Members seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
