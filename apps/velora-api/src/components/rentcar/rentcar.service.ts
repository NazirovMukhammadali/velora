import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { AllRentcarsInquiry, RentcarInput, RentcarsInquiry } from '../../libs/dto/rentcar/rentcar.input';
import { RentcarUpdate } from '../../libs/dto/rentcar/rentcar.update';
import { Rentcar, Rentcars } from '../../libs/dto/rentcar/rentcar';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { RentcarStatus } from '../../libs/enums/rentcar.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { T } from '../../libs/types/common';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class RentcarService {
	/**
	 * Domain contract:
	 * Rentcar is a discovery-only domain in MVP.
	 * Responsibilities: search, list, detail (plus non-transactional engagement stats like views/likes).
	 * Booking/confirmation/review transactions are intentionally handled in tours + bookings domains.
	 */
	constructor(
		@InjectModel('Rentcar') private readonly rentcarModel: Model<Rentcar>,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
	) {}

	public async createRentcar(input: RentcarInput): Promise<Rentcar> {
		try {
			return await this.rentcarModel.create({
				...input,
				rentcarStatus: input.rentcarStatus ?? RentcarStatus.ACTIVE,
			});
		} catch (err) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getRentcars(input: RentcarsInquiry): Promise<Rentcars> {
		const match: T = { rentcarStatus: RentcarStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const search = input?.search ?? {};

		if (search.carLocation) match.carLocation = search.carLocation;
		if (search.carCategory) match.carCategory = search.carCategory;
		if (search.transmission) match.transmission = search.transmission;
		if (search.minPrice !== undefined || search.maxPrice !== undefined) {
			match.dailyPrice = {};
			if (search.minPrice !== undefined) match.dailyPrice.$gte = search.minPrice;
			if (search.maxPrice !== undefined) match.dailyPrice.$lte = search.maxPrice;
		}
		if (search.minSeats !== undefined) match.seats = { $gte: search.minSeats };
		if (search.text) {
			const regex = new RegExp(search.text, 'i');
			match.$or = [{ carTitle: regex }, { carLocation: regex }, { carDesc: regex }];
		}

		const pipeline: PipelineStage[] = [
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
					metaCounter: [{ $count: 'total' }],
				},
			},
		];

		const result = await this.rentcarModel.aggregate(pipeline).exec();
		return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
	}

	public async getRentcarDetail(memberId: Types.ObjectId | null, rentcarId: string): Promise<Rentcar> {
		this.validateObjectId(rentcarId, 'rentcarId');

		const result = await this.rentcarModel
			.findOne({
				_id: shapeIntoMongoObjectId(rentcarId),
				rentcarStatus: { $ne: RentcarStatus.DELETE },
			})
			.lean()
			.exec();

		if (!result) throw new NotFoundException(Message.NO_DATA_FOUND);
		const targetRentcar = result as Rentcar;

		if (memberId) {
			const viewInput = {
				memberId: memberId,
				viewRefId: shapeIntoMongoObjectId(rentcarId),
				viewGroup: ViewGroup.RENTCAR,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.rentcarModel
					.findByIdAndUpdate(shapeIntoMongoObjectId(rentcarId), { $inc: { rentcarViews: 1 } }, { new: true })
					.exec();
				targetRentcar.rentcarViews++;
			}

			const likeInput: LikeInput = {
				memberId,
				likeRefId: shapeIntoMongoObjectId(rentcarId),
				likeGroup: LikeGroup.CAR,
			};
			targetRentcar.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		return targetRentcar;
	}

	public async likeTargetRentcar(memberId: Types.ObjectId, rentcarId: Types.ObjectId): Promise<Rentcar> {
		const targetRentcar = await this.rentcarModel
			.findOne({
				_id: rentcarId,
				rentcarStatus: RentcarStatus.ACTIVE,
			})
			.exec();
		if (!targetRentcar) throw new NotFoundException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId,
			likeRefId: rentcarId,
			likeGroup: LikeGroup.CAR,
		};
		const modifier = await this.likeService.toggleLike(input);

		const updated = await this.rentcarModel
			.findByIdAndUpdate(rentcarId, { $inc: { rentcarLikes: modifier } }, { new: true })
			.exec();
		if (!updated) throw new BadRequestException(Message.SOMETHING_WENT_WRONG);

		return updated;
	}

	public async getFavoriteRentcars(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Rentcars> {
		return await this.likeService.getFavoriteRentcars(memberId, input);
	}

	public async updateRentcarByAdmin(input: RentcarUpdate): Promise<Rentcar> {
		const search: T = { _id: input._id, rentcarStatus: { $ne: RentcarStatus.DELETE } };
		const result = await this.rentcarModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}

	public async removeRentcarByAdmin(rentcarId: Types.ObjectId): Promise<Rentcar> {
		const result = await this.rentcarModel
			.findOneAndUpdate(
				{ _id: rentcarId, rentcarStatus: { $ne: RentcarStatus.DELETE } },
				{ rentcarStatus: RentcarStatus.DELETE },
				{ new: true },
			)
			.exec();
		if (!result) throw new BadRequestException(Message.REMOVE_FAILED);
		return result;
	}

	public async getAllRentcarsByAdmin(input: AllRentcarsInquiry): Promise<Rentcars> {
		const { page, limit, search } = input;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (search.rentcarStatus) match.rentcarStatus = search.rentcarStatus;
		if (search.carLocation) match.carLocation = search.carLocation;
		if (search.carCategory) match.carCategory = search.carCategory;

		const result = await this.rentcarModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
	}

	private validateObjectId(id: string, key: string): void {
		if (!Types.ObjectId.isValid(id)) {
			throw new BadRequestException(`${key} ${Message.BAD_REQUEST}`);
		}
	}
}
