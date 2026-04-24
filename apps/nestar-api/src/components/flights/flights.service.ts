import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { FlightsInquiry, FlightInput } from '../../libs/dto/flight/flight.input';
import { Flight, Flights } from '../../libs/dto/flight/flight';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { FlightStatus } from '../../libs/enums/flight.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { LikeInput } from '../../libs/dto/like/like.input';

@Injectable()
export class FlightsService {
    constructor(
        @InjectModel('Flight') private readonly flightModel: Model<Flight>,
        private readonly likeService: LikeService,
        private readonly viewService: ViewService,
    ) { }

    public async createFlight(input: FlightInput): Promise<Flight> {
        try {
            return await this.flightModel.create({
                ...input,
                flightStatus: input.flightStatus ?? FlightStatus.ACTIVE,
            });
        } catch (err) {
            console.log('Error, createFlight:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getFlights(input: FlightsInquiry): Promise<Flights> {
        const match: Record<string, any> = { flightStatus: FlightStatus.ACTIVE };
        const sort = { [input?.sort ?? 'departureTime']: input?.direction ?? Direction.ASC };
        const { departureAirport, arrivalAirport, departureDate, cabinClass } = input.search;

        if (departureAirport) match.departureAirport = departureAirport;
        if (arrivalAirport) match.arrivalAirport = arrivalAirport;
        if (cabinClass) match.cabinClass = cabinClass;
        if (departureDate) {
            const dayStart = new Date(departureDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(departureDate);
            dayEnd.setHours(23, 59, 59, 999);
            match.departureTime = { $gte: dayStart, $lte: dayEnd };
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

        const result = await this.flightModel.aggregate(pipeline).exec();
        return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
    }

    public async getFlightDetail(memberId: Types.ObjectId | null, flightId: string): Promise<Flight> {
        this.validateObjectId(flightId, 'flightId');

        const result = await this.flightModel
            .findOne({
                _id: shapeIntoMongoObjectId(flightId),
                flightStatus: { $ne: FlightStatus.CANCELLED },
            })
            .lean()
            .exec();
        if (!result) throw new NotFoundException(Message.NO_DATA_FOUND);

        const targetFlight = result as Flight;
        if (memberId) {
            const viewInput = {
                memberId: memberId as Types.ObjectId,
                viewRefId: shapeIntoMongoObjectId(flightId),
                viewGroup: ViewGroup.FLIGHT,
            };
            const newView = await this.viewService.recordView(viewInput);
            if (newView) {
                await this.flightModel
                    .findByIdAndUpdate(
                        shapeIntoMongoObjectId(flightId),
                        { $inc: { flightViews: 1 } },
                        { new: true },
                    )
                    .exec();
                targetFlight.flightViews++;
            }

            const likeInput: LikeInput = {
                memberId,
                likeRefId: shapeIntoMongoObjectId(flightId),
                likeGroup: LikeGroup.FLIGHT,
            };
            targetFlight.meLiked = await this.likeService.checkLikeExistence(likeInput);
        }

        return targetFlight;
    }

    public async likeTargetFlight(memberId: Types.ObjectId, flightId: Types.ObjectId): Promise<Flight> {
        const targetFlight = await this.flightModel
            .findOne({
                _id: flightId,
                flightStatus: FlightStatus.ACTIVE,
            })
            .exec();
        if (!targetFlight) throw new NotFoundException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            memberId,
            likeRefId: flightId,
            likeGroup: LikeGroup.FLIGHT,
        };
        const modifier = await this.likeService.toggleLike(input);

        const updated = await this.flightModel
            .findByIdAndUpdate(
                flightId,
                { $inc: { flightLikes: modifier } },
                { new: true },
            )
            .exec();
        if (!updated) throw new BadRequestException(Message.SOMETHING_WENT_WRONG);

        return updated;
    }

    public async getFavoriteFlights(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Flights> {
        return await this.likeService.getFavoriteFlights(memberId, input);
    }

    private validateObjectId(id: string, key: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`${key} ${Message.BAD_REQUEST}`);
        }
    }
}
