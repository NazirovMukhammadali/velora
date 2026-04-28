import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { HotelsInquiry, HotelInput, AllHotelsInquiry } from '../../libs/dto/hotel/hotel.input';
import { HotelUpdate } from '../../libs/dto/hotel/hotel.update';
import { Hotels, Hotel } from '../../libs/dto/hotel/hotel';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { HotelStatus } from '../../libs/enums/hotel.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { T } from '../../libs/types/common';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class HotelsService {
    constructor(
        @InjectModel('Hotel') private readonly hotelModel: Model<Hotel>,
        private readonly likeService: LikeService,
        private readonly viewService: ViewService,
    ) { }

    public async createHotel(input: HotelInput): Promise<Hotel> {
        try {
            return await this.hotelModel.create({
                ...input,
                hotelStatus: input.hotelStatus ?? HotelStatus.ACTIVE,
            });
        } catch (err) {
            console.log('Error, createHotel:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getHotels(input: HotelsInquiry): Promise<Hotels> {
        const match: T = { hotelStatus: HotelStatus.ACTIVE };
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
        const search = input?.search ?? ({} as T);

        if (search.hotelLocation) match.hotelLocation = search.hotelLocation;
        if (search.hotelStatus) match.hotelStatus = search.hotelStatus;
        if (search.minPrice !== undefined || search.maxPrice !== undefined) {
            match.hotelPrice = {};
            if (search.minPrice !== undefined) match.hotelPrice.$gte = search.minPrice;
            if (search.maxPrice !== undefined) match.hotelPrice.$lte = search.maxPrice;
        }
        if (search.minStars !== undefined) match.hotelStars = { $gte: search.minStars };
        if (search.text) {
            const regex = new RegExp(search.text, 'i');
            match.$or = [{ hotelName: regex }, { hotelLocation: regex }, { hotelDesc: regex }];
        }

        const pipeline: PipelineStage[] = [
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                    list: [
                        { $skip: (input.page - 1) * input.limit },
                        { $limit: input.limit },
                    ],
                    metaCounter: [{ $count: 'total' }],
                },
            },
        ];

        const result = await this.hotelModel.aggregate(pipeline).exec();
        return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
    }

    public async getHotelDetail(memberId: Types.ObjectId | null, hotelId: string): Promise<Hotel> {
        this.validateObjectId(hotelId, 'hotelId');

        const result = await this.hotelModel
            .findOne({
                _id: shapeIntoMongoObjectId(hotelId),
                hotelStatus: { $ne: HotelStatus.DELETE },
            })
            .lean()
            .exec();

        if (!result) throw new NotFoundException(Message.NO_DATA_FOUND);
        const targetHotel = result as Hotel;

        if (memberId) {
            const viewInput = {
                memberId: memberId as Types.ObjectId,
                viewRefId: shapeIntoMongoObjectId(hotelId),
                viewGroup: ViewGroup.HOTEL,
            };
            const newView = await this.viewService.recordView(viewInput);
            if (newView) {
                await this.hotelModel
                    .findByIdAndUpdate(
                        shapeIntoMongoObjectId(hotelId),
                        { $inc: { hotelViews: 1 } },
                        { new: true },
                    )
                    .exec();
                targetHotel.hotelViews++;
            }

            const likeInput: LikeInput = {
                memberId,
                likeRefId: shapeIntoMongoObjectId(hotelId),
                likeGroup: LikeGroup.HOTEL,
            };
            targetHotel.meLiked = await this.likeService.checkLikeExistence(likeInput);
        }

        return targetHotel;
    }

    public async likeTargetHotel(memberId: Types.ObjectId, hotelId: Types.ObjectId): Promise<Hotel> {
        const targetHotel = await this.hotelModel
            .findOne({
                _id: hotelId,
                hotelStatus: HotelStatus.ACTIVE,
            })
            .exec();
        if (!targetHotel) throw new NotFoundException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            memberId,
            likeRefId: hotelId,
            likeGroup: LikeGroup.HOTEL,
        };
        const modifier = await this.likeService.toggleLike(input);

        const updated = await this.hotelModel
            .findByIdAndUpdate(
                hotelId,
                { $inc: { hotelLikes: modifier } },
                { new: true },
            )
            .exec();
        if (!updated) throw new BadRequestException(Message.SOMETHING_WENT_WRONG);

        return updated;
    }

    public async getFavoriteHotels(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Hotels> {
        return await this.likeService.getFavoriteHotels(memberId, input);
    }

    public async updateHotelByAdmin(input: HotelUpdate): Promise<Hotel> {
        const search: T = { _id: input._id, hotelStatus: { $ne: HotelStatus.DELETE } };
        const result = await this.hotelModel.findOneAndUpdate(search, input, { new: true }).exec();
        if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
        return result;
    }

    public async removeHotelByAdmin(hotelId: Types.ObjectId): Promise<Hotel> {
        const result = await this.hotelModel
            .findOneAndUpdate(
                { _id: hotelId, hotelStatus: { $ne: HotelStatus.DELETE } },
                { hotelStatus: HotelStatus.DELETE },
                { new: true },
            )
            .exec();
        if (!result) throw new BadRequestException(Message.REMOVE_FAILED);

        return result;
    }

    public async getAllHotelsByAdmin(input: AllHotelsInquiry): Promise<Hotels> {
        const { page, limit, search } = input;
        const match: T = {};
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

        if (search.hotelStatus) match.hotelStatus = search.hotelStatus;
        if (search.hotelLocation) match.hotelLocation = search.hotelLocation;

        const result = await this.hotelModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                        ],
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
