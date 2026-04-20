import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { T } from '../../libs/types/common';
import { Tour, Tours } from '../../libs/dto/tour/tour';
import { AgentToursInquiry, TourInput, ToursInquiry } from '../../libs/dto/tour/tour.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { TourStatus } from '../../libs/enums/tour.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class ToursService {
    constructor(
        @InjectModel('Tour') private readonly tourModel: Model<Tour>,
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

    public async getTourDetail(tourId: string): Promise<Tour> {
        this.validateObjectId(tourId, 'tourId');

        const result = await this.tourModel
            .findOne({
                _id: shapeIntoMongoObjectId(tourId),
                tourStatus: { $ne: TourStatus.DELETE },
            })
            .lean()
            .exec();

        if (!result) throw new NotFoundException(Message.NO_DATA_FOUND);
        return result as Tour;
    }

    private validateObjectId(id: string, key: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`${key} ${Message.BAD_REQUEST}`);
        }
    }
}
