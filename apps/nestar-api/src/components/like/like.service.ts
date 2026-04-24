import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { LikeInput } from '../../libs/dto/like/like.input';
import { T } from '../../libs/types/common';
import { Message } from '../../libs/enums/common.enum';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { Properties } from '../../libs/dto/property/property';
import { lookupFavorite } from '../../libs/config';
import { Flights } from '../../libs/dto/flight/flight';
import { Hotels } from '../../libs/dto/hotel/hotel';
import { Tours } from '../../libs/dto/tour/tour';

@Injectable()
export class LikeService {
    constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) { }

    public async toggleLike(input: LikeInput): Promise<number> {
        const search: T = { memberId: input.memberId, likeRefId: input.likeRefId };
        const exist = await this.likeModel.findOne(search).exec();
        let modifier = 1;

        if (exist) {
            await this.likeModel.findOneAndDelete(search).exec();
            modifier = -1;
        } else {
            try {
                await this.likeModel.create(input);
            } catch (err) {
                console.log('Error, Service.model:', err.message);
                throw new BadRequestException(Message.CREATE_FAILED);
            }
        }
        return modifier;
    }

    public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
        const { memberId, likeRefId } = input;
        const result = await this.likeModel
            .findOne({
                memberId: memberId,
                likeRefId: likeRefId,
            })
            .exec();

        return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
    }

    public async getFavoriteProperties(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties> {
        const { page, limit } = input;
        const match: T = { likeGroup: LikeGroup.PROPERTY, memberId: memberId }; // distraction Match orqaliy

        const data: T[] = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } },
                {
                    $lookup: {
                        from: 'properties',
                        localField: 'likeRefId',
                        foreignField: '_id',
                        as: 'favoriteProperty', // Qaysi nom bilan qabul etyapmiz
                    },
                },
                { $unwind: '$favoriteProperty' }, //oddiy ARRAY ichidan tashqariga chiqarishni talap qilyapmiz
                {
                    $facet: {
                        // Pipelines 2 - list & metaCounter
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupFavorite,
                            { $unwind: '$favoriteProperty.memberData' },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Properties = { list: [], metaCounter: data[0].metaCounter };
        result.list = data[0].list.map((ele) => ele.favoriteProperty); // iteration qilyapmiz MAP orqaliy

        return result;
    }

    public async getFavoriteTours(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Tours> {
        const { page, limit } = input;
        const match: T = { likeGroup: LikeGroup.TOUR, memberId: memberId };

        const data: T[] = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } },
                {
                    $lookup: {
                        from: 'tours',
                        localField: 'likeRefId',
                        foreignField: '_id',
                        as: 'favoriteTour',
                    },
                },
                { $unwind: '$favoriteTour' },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            {
                                $lookup: {
                                    from: 'members',
                                    localField: 'favoriteTour.memberId',
                                    foreignField: '_id',
                                    as: 'favoriteTour.memberData',
                                },
                            },
                            { $unwind: '$favoriteTour.memberData' },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Tours = { list: [], metaCounter: data?.[0]?.metaCounter ?? [{ total: 0 }] };
        result.list = (data?.[0]?.list ?? []).map((ele) => ele.favoriteTour);
        return result;
    }

    public async getFavoriteHotels(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Hotels> {
        const { page, limit } = input;
        const match: T = { likeGroup: LikeGroup.HOTEL, memberId: memberId };

        const data: T[] = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } },
                {
                    $lookup: {
                        from: 'hotels',
                        localField: 'likeRefId',
                        foreignField: '_id',
                        as: 'favoriteHotel',
                    },
                },
                { $unwind: '$favoriteHotel' },
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

        const result: Hotels = { list: [], metaCounter: data?.[0]?.metaCounter ?? [{ total: 0 }] };
        result.list = (data?.[0]?.list ?? []).map((ele) => ele.favoriteHotel);
        return result;
    }

    public async getFavoriteFlights(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Flights> {
        const { page, limit } = input;
        const match: T = { likeGroup: LikeGroup.FLIGHT, memberId: memberId };

        const data: T[] = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } },
                {
                    $lookup: {
                        from: 'flights',
                        localField: 'likeRefId',
                        foreignField: '_id',
                        as: 'favoriteFlight',
                    },
                },
                { $unwind: '$favoriteFlight' },
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

        const result: Flights = { list: [], metaCounter: data?.[0]?.metaCounter ?? [{ total: 0 }] };
        result.list = (data?.[0]?.list ?? []).map((ele) => ele.favoriteFlight);
        return result;
    }
}