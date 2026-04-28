import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import MemberSchema from '../schemas/Member.model';
import TourSchema from '../schemas/Tour.model';
import BookingSchema from '../schemas/Booking.model';
import { BookingStatus, BookingType } from '../libs/enums/booking.enum';
import { MemberAuthType, MemberStatus, MemberType } from '../libs/enums/member.enum';
import { TourStatus } from '../libs/enums/tour.enum';

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

const ensureDemoMember = async (memberModel: mongoose.Model<any>): Promise<Types.ObjectId> => {
	const existing = (await memberModel
		.findOne({ memberNick: 'velora_demo_user' })
		.select('_id')
		.lean()
		.exec()) as { _id?: Types.ObjectId } | null;
	if (existing?._id) return existing._id as Types.ObjectId;

	const hash = await bcrypt.hash('User@12345', 10);
	const created = await memberModel.create({
		memberType: MemberType.USER,
		memberStatus: MemberStatus.ACTIVE,
		memberAuthType: MemberAuthType.PHONE,
		memberPhone: '+998770000201',
		memberNick: 'velora_demo_user',
		memberPassword: hash,
		memberFullName: 'Velora Demo User',
		memberDesc: 'Seeded demo user for booking/review gating checks',
	});
	return created._id as Types.ObjectId;
};

const seedConfirmedBooking = async (): Promise<void> => {
	const mongoUri = resolveMongoUri();
	await mongoose.connect(mongoUri);

	const MemberModel = mongoose.models.Member || mongoose.model('Member', MemberSchema);
	const TourModel = mongoose.models.Tour || mongoose.model('Tour', TourSchema);
	const BookingModel = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

	const userId = await ensureDemoMember(MemberModel);
	const targetTour = (await TourModel.findOne({ tourStatus: TourStatus.ACTIVE })
		.sort({ createdAt: -1 })
		.lean()
		.exec()) as { _id: Types.ObjectId; memberId: Types.ObjectId; tourPrice?: number } | null;
	if (!targetTour?._id) throw new Error('No ACTIVE tour found. Run seed:tours first.');

	await BookingModel.deleteMany({ bookingTitle: 'VELORA Seed: Confirmed Demo Booking' });
	await BookingModel.create({
		bookingType: BookingType.TOUR,
		bookingStatus: BookingStatus.CONFIRMED,
		bookingRefId: targetTour._id,
		memberId: userId,
		agentId: targetTour.memberId,
		bookingTitle: 'VELORA Seed: Confirmed Demo Booking',
		bookingPrice: targetTour.tourPrice ?? 0,
	});

	await TourModel.findByIdAndUpdate(targetTour._id, { $inc: { tourSoldCount: 1 } }).exec();

	console.log('Seed completed: inserted 1 confirmed demo booking');
	await mongoose.disconnect();
};

seedConfirmedBooking().catch(async (error) => {
	console.error('Bookings seed failed:', error);
	await mongoose.disconnect();
	process.exit(1);
});
