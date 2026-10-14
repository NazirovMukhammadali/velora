import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import mongoose, { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MemberAuthType, MemberStatus, MemberType } from '../src/libs/enums/member.enum';
import MemberSchema from '../src/schemas/Member.model';
import FollowSchema from '../src/schemas/Follow.model';
import { MemberService } from '../src/components/member/member.service';
import { FollowService } from '../src/components/follow/follow.service';

const canRunMongoMemoryTests = process.platform !== 'darwin' || process.env.RUN_MONGO_MEMORY_TESTS === 'true';
const describeIntegration = canRunMongoMemoryTests ? describe : describe.skip;

/**
 * Follow / followers flow against a real (in-memory) MongoDB so the $lookup pipelines,
 * counters and the unique index are exercised for real; auth, views and likes are stubbed.
 */
describeIntegration('Follow flow (integration, mongo-memory)', () => {
	let mongod: MongoMemoryServer | undefined;
	let connection: mongoose.Connection;
	let memberModel: Model<any>;
	let followModel: Model<any>;
	let memberService: MemberService;
	let followService: FollowService;
	let ids: Record<'user1' | 'user2' | 'agent' | 'admin', Types.ObjectId>;

	const page = { page: 1, limit: 10 };
	const counters = async (id: Types.ObjectId) => {
		const doc = await memberModel.findById(id).lean<any>();
		return { followers: doc.memberFollowers ?? 0, followings: doc.memberFollowings ?? 0 };
	};

	beforeAll(async () => {
		// CI provides a real MongoDB (MONGO_TEST_URI); locally an in-memory server is started.
		const externalUri = process.env.MONGO_TEST_URI;
		if (!externalUri) mongod = await MongoMemoryServer.create();
		const uri = externalUri ?? mongod!.getUri();
		connection = await mongoose.createConnection(uri, { dbName: 'velora_follow_integration' }).asPromise();
		await connection.dropDatabase();
		memberModel = connection.model('Member', MemberSchema);
		followModel = connection.model('Follow', FollowSchema);
		await followModel.syncIndexes();

		const likeService: any = { checkLikeExistence: async () => [] };
		const viewService: any = { recordView: async () => false };
		memberService = new MemberService(memberModel as any, followModel, {} as any, viewService, likeService);
		followService = new FollowService(followModel as any, memberService);

		const make = (nick: string, memberType: MemberType) =>
			memberModel.create({
				memberNick: nick,
				memberPhone: `+99890${Math.floor(1000000 + Math.random() * 8999999)}`,
				memberPassword: 'hashed',
				memberType,
				memberStatus: MemberStatus.ACTIVE,
				memberAuthType: MemberAuthType.PHONE,
			});
		const [user1, user2, agent, admin] = await Promise.all([
			make('user_one', MemberType.USER),
			make('user_two', MemberType.USER),
			make('agent_one', MemberType.AGENT),
			make('admin_one', MemberType.ADMIN),
		]);
		ids = { user1: user1._id, user2: user2._id, agent: agent._id, admin: admin._id };
	}, 120_000);

	afterAll(async () => {
		await connection?.dropDatabase();
		await connection?.close();
		await mongod?.stop();
	});

	it('lets travellers and agents follow each other (Instagram-style) and updates both counters', async () => {
		await followService.subscribe(ids.user1, ids.user2); // user → user
		await followService.subscribe(ids.agent, ids.user2); // agent → user
		await followService.subscribe(ids.user1, ids.agent); // user → agent

		expect(await counters(ids.user2)).toEqual({ followers: 2, followings: 0 });
		expect(await counters(ids.user1)).toEqual({ followers: 0, followings: 2 });
		expect(await counters(ids.agent)).toEqual({ followers: 1, followings: 1 });
	});

	it('rejects self-follow, duplicates and admins', async () => {
		await expect(followService.subscribe(ids.user1, ids.user1)).rejects.toBeInstanceOf(InternalServerErrorException);
		await expect(followService.subscribe(ids.user1, ids.user2)).rejects.toBeInstanceOf(BadRequestException);
		await expect(followService.subscribe(ids.user1, ids.admin)).rejects.toBeInstanceOf(BadRequestException);
		expect(await counters(ids.user2)).toEqual({ followers: 2, followings: 0 });
	});

	it('tells the viewer whether they already follow a profile (drives Follow / Unfollow)', async () => {
		const followed = await memberService.getMember(ids.user1, ids.user2);
		expect(followed.meFollowed).toEqual([expect.objectContaining({ myFollowing: true })]);

		const notFollowed = await memberService.getMember(ids.user2, ids.user1);
		expect(notFollowed.meFollowed).toEqual([]);

		const ownProfile = await memberService.getMember(ids.user1, ids.user1);
		expect(ownProfile.meFollowed).toEqual([]);
	});

	it('lists followers with member data and the viewer-relative myFollowing flag', async () => {
		const res: any = await followService.getMemberFollowers(ids.user1, { ...page, search: { followingId: ids.user2 } });
		expect(res.metaCounter[0].total).toBe(2);
		const byNick = Object.fromEntries(res.list.map((row: any) => [row.followerData.memberNick, row]));
		// user1 follows agent_one, so that row reports myFollowing: true for viewer user1.
		expect(byNick.agent_one.meFollowed).toEqual([expect.objectContaining({ myFollowing: true })]);
		expect(byNick.user_one.meFollowed).toEqual([]);

		const followings: any = await followService.getMemberFollowings(ids.user2, {
			...page,
			search: { followerId: ids.user1 },
		});
		expect(followings.list.map((row: any) => row.followingData.memberNick).sort()).toEqual(['agent_one', 'user_two']);
	});

	it('hides removed or deleted members from follow lists and keeps the total in sync', async () => {
		await memberModel.updateOne({ _id: ids.agent }, { memberStatus: MemberStatus.DELETE });
		const res: any = await followService.getMemberFollowers(null as any, {
			...page,
			search: { followingId: ids.user2 },
		});
		expect(res.list.map((row: any) => row.followerData.memberNick)).toEqual(['user_one']);
		expect(res.metaCounter[0].total).toBe(1);
		await memberModel.updateOne({ _id: ids.agent }, { memberStatus: MemberStatus.ACTIVE });
	});

	it('unfollows and decrements both counters', async () => {
		await followService.unsubscribe(ids.user1, ids.user2);
		expect(await counters(ids.user2)).toEqual({ followers: 1, followings: 0 });
		expect(await counters(ids.user1)).toEqual({ followers: 0, followings: 1 });
		const profile = await memberService.getMember(ids.user1, ids.user2);
		expect(profile.meFollowed).toEqual([]);
		await expect(followService.unsubscribe(ids.user1, ids.user2)).rejects.toBeInstanceOf(InternalServerErrorException);
	});
});
