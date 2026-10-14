import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FlightStatus } from '../../velora-api/src/libs/enums/flight.enum';
import { HotelStatus } from '../../velora-api/src/libs/enums/hotel.enum';
import { MemberStatus, MemberType } from '../../velora-api/src/libs/enums/member.enum';
import { RentcarStatus } from '../../velora-api/src/libs/enums/rentcar.enum';
import { TourStatus } from '../../velora-api/src/libs/enums/tour.enum';

/** Field prefix + active status of each catalog: rank = likes × 2 + views. */
const LISTINGS = [
	{ model: 'Hotel', prefix: 'hotel', active: HotelStatus.ACTIVE },
	{ model: 'Tour', prefix: 'tour', active: TourStatus.ACTIVE },
	{ model: 'Rentcar', prefix: 'rentcar', active: RentcarStatus.ACTIVE },
	{ model: 'Flight', prefix: 'flight', active: FlightStatus.ACTIVE },
] as const;

/** Missing counters count as 0 so old documents still get a rank. */
const field = (name: string) => ({ $ifNull: [`$${name}`, 0] });

@Injectable()
export class BatchService {
	private readonly models: Record<(typeof LISTINGS)[number]['model'], Model<unknown>>;

	constructor(
		@InjectModel('Hotel') hotelModel: Model<unknown>,
		@InjectModel('Tour') tourModel: Model<unknown>,
		@InjectModel('Rentcar') rentcarModel: Model<unknown>,
		@InjectModel('Flight') flightModel: Model<unknown>,
		@InjectModel('Member') private readonly memberModel: Model<unknown>,
	) {
		this.models = { Hotel: hotelModel, Tour: tourModel, Rentcar: rentcarModel, Flight: flightModel };
	}

	/**
	 * Re-ranks every active hotel, tour, car and flight in one server-side update per collection
	 * (no read-modify-write round trips, no window where ranks are reset to 0).
	 * The ranks drive "popular" ordering on the site and in the AI assistant's fallbacks.
	 */
	public async batchTopListings(): Promise<void> {
		await Promise.all(
			LISTINGS.map(({ model, prefix, active }) =>
				this.models[model]
					.updateMany({ [`${prefix}Status`]: active }, [
						{
							$set: {
								[`${prefix}Rank`]: {
									$add: [{ $multiply: [field(`${prefix}Likes`), 2] }, field(`${prefix}Views`)],
								},
							},
						},
					])
					.exec(),
			),
		);
	}

	/** Agents: tours × 5 + articles × 3 + likes × 2 + views (memberProperties holds the agent's tour count). */
	public async batchTopAgents(): Promise<void> {
		await this.memberModel
			.updateMany({ memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE }, [
				{
					$set: {
						memberRank: {
							$add: [
								{ $multiply: [field('memberProperties'), 5] },
								{ $multiply: [field('memberArticles'), 3] },
								{ $multiply: [field('memberLikes'), 2] },
								field('memberViews'),
							],
						},
					},
				},
			])
			.exec();
	}

	public getHello(): string {
		return 'Welcome to Velora BATCH Server!';
	}
}
