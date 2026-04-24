import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { T } from '../../libs/types/common';
import { Tour, Tours } from '../../libs/dto/tour/tour';
import { AgentToursInquiry, TourInput, ToursInquiry } from '../../libs/dto/tour/tour.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { TourStatus } from '../../libs/enums/tour.enum';
import { LikeService } from '../like/like.service';
import { MemberService } from '../member/member.service';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class ToursService {
    constructor(
        @InjectModel('Tour') private readonly tourModel: Model<Tour>,
        private readonly memberService: MemberService,
        private readonly likeService: LikeService,
    ) { }

    public async createTour(input: TourInput): Promise<Tour> {
        try {
            return await this.tourModel.create({
                ...input,
                tourStatus: input.tourStatus ?? TourStatus.ACTIVE,
            });
        } catch (err) {
            console.log('Error, createTour:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getTours(input: ToursInquiry): Promise<Tours> {
        const match: T = { tourStatus: TourStatus.ACTIVE };
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
        const search = input?.search ?? ({} as T);

        if (search.memberId) match.memberId = shapeIntoMongoObjectId(search.memberId);
        if (search.tourLocation) match.tourLocation = search.tourLocation;
        if (search.tourStatus) match.tourStatus = search.tourStatus;
        if (search.minPrice !== undefined || search.maxPrice !== undefined) {
            match.tourPrice = {};
            if (search.minPrice !== undefined) match.tourPrice.$gte = search.minPrice;
            if (search.maxPrice !== undefined) match.tourPrice.$lte = search.maxPrice;
        }
        if (search.text) {
            const regex = new RegExp(search.text, 'i');
            match.$or = [{ tourTitle: regex }, { tourLocation: regex }, { tourDesc: regex }];
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

        const result = await this.tourModel.aggregate(pipeline).exec();
        return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
    }

    public async getAgentTours(memberId: string, input: AgentToursInquiry): Promise<Tours> {
        this.validateObjectId(memberId, 'agentId');

        const match: T = {
            memberId: shapeIntoMongoObjectId(memberId),
            tourStatus: TourStatus.ACTIVE,
        };
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

        if (input.tourLocation) match.tourLocation = input.tourLocation;
        if (input.minPrice !== undefined || input.maxPrice !== undefined) {
            match.tourPrice = {};
            if (input.minPrice !== undefined) match.tourPrice.$gte = input.minPrice;
            if (input.maxPrice !== undefined) match.tourPrice.$lte = input.maxPrice;
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

        const result = await this.tourModel.aggregate(pipeline).exec();
        return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
    }

    public async getTourDetail(memberId: Types.ObjectId | null, tourId: string): Promise<Tour> {
        this.validateObjectId(tourId, 'tourId');

        const result = await this.tourModel
            .findOne({
                _id: shapeIntoMongoObjectId(tourId),
                tourStatus: { $ne: TourStatus.DELETE },
            })
            .lean()
            .exec();

        if (!result) throw new NotFoundException(Message.NO_DATA_FOUND);
        const targetTour = result as Tour;
        targetTour.memberData = await this.memberService.getMember(null, targetTour.memberId);

        if (memberId) {
            const likeInput: LikeInput = {
                memberId,
                likeRefId: shapeIntoMongoObjectId(tourId),
                likeGroup: LikeGroup.TOUR,
            };
            targetTour.meLiked = await this.likeService.checkLikeExistence(likeInput);
        }

        return targetTour;
    }

    public async likeTargetTour(memberId: Types.ObjectId, tourId: Types.ObjectId): Promise<Tour> {
        const targetTour = await this.tourModel
            .findOne({
                _id: tourId,
                tourStatus: TourStatus.ACTIVE,
            })
            .exec();

        if (!targetTour) throw new NotFoundException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            memberId,
            likeRefId: tourId,
            likeGroup: LikeGroup.TOUR,
        };
        const modifier = await this.likeService.toggleLike(input);

        const updatedTour = await this.tourModel
            .findByIdAndUpdate(
                tourId,
                { $inc: { tourLikes: modifier } },
                { new: true },
            )
            .exec();

        if (!updatedTour) throw new BadRequestException(Message.SOMETHING_WENT_WRONG);
        return updatedTour;
    }

    private validateObjectId(id: string, key: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`${key} ${Message.BAD_REQUEST}`);
        }
    }
}
