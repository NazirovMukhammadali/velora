import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AllFlightsInquiry, FlightsInquiry, FlightInput } from '../../libs/dto/flight/flight.input';
import { FlightUpdate } from '../../libs/dto/flight/flight.update';
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
    /**
     * Domain contract:
     * Flights is a discovery-only domain in MVP.
     * Responsibilities: search, list, detail (plus non-transactional engagement stats like views/likes).
     * Booking/confirmation/review transactions are intentionally handled in tours + bookings domains.
     */
    constructor(
        @InjectModel('Flight') private readonly flightModel: Model<Flight>,
        private readonly likeService: LikeService,
        private readonly viewService: ViewService,
    ) { }

    public async createFlight(input: FlightInput): Promise<Flight> {
        this.validateFlightBusinessRules(input);
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
        const { departureAirport, arrivalAirport, departureDate, cabinClass, airline, minPrice, maxPrice } =
            input.search ?? {};

        if (departureAirport) match.departureAirport = departureAirport;
        if (arrivalAirport) match.arrivalAirport = arrivalAirport;
        if (cabinClass) match.cabinClass = cabinClass;
        if (airline) match.airline = airline;
        if (minPrice !== undefined || maxPrice !== undefined) {
            match.basePrice = {};
            if (minPrice !== undefined) match.basePrice.$gte = minPrice;
            if (maxPrice !== undefined) match.basePrice.$lte = maxPrice;
        }
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
                flightStatus: { $ne: FlightStatus.DELETE },
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

    public async getAllFlightsByAdmin(input: AllFlightsInquiry): Promise<Flights> {
        const { page, limit, search } = input;
        const match: Record<string, any> = {};
        const sort = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

        if (search?.departureAirport) match.departureAirport = search.departureAirport;
        if (search?.arrivalAirport) match.arrivalAirport = search.arrivalAirport;
        if (search?.airline) match.airline = search.airline;
        if (search?.flightStatus) match.flightStatus = search.flightStatus;
        if (search?.minPrice !== undefined || search?.maxPrice !== undefined) {
            match.basePrice = {};
            if (search.minPrice !== undefined) match.basePrice.$gte = search.minPrice;
            if (search.maxPrice !== undefined) match.basePrice.$lte = search.maxPrice;
        }

        const result = await this.flightModel
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

    public async updateFlightByAdmin(input: FlightUpdate): Promise<Flight> {
        if (input.flightStatus === FlightStatus.DELETE) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        const existing = await this.flightModel
            .findOne({
                _id: input._id,
                flightStatus: { $ne: FlightStatus.DELETE },
            })
            .exec();
        if (!existing) throw new NotFoundException(Message.NO_DATA_FOUND);

        const merged = {
            departureAirport: input.departureAirport ?? existing.departureAirport,
            arrivalAirport: input.arrivalAirport ?? existing.arrivalAirport,
            departureTime: input.departureTime ?? existing.departureTime,
            arrivalTime: input.arrivalTime ?? existing.arrivalTime,
        };
        this.validateFlightBusinessRules(merged);

        const updated = await this.flightModel
            .findOneAndUpdate(
                { _id: input._id, flightStatus: { $ne: FlightStatus.DELETE } },
                input,
                { new: true },
            )
            .exec();
        if (!updated) throw new BadRequestException(Message.UPDATE_FAILED);

        return updated;
    }

    public async removeFlightByAdmin(flightId: Types.ObjectId): Promise<Flight> {
        const removed = await this.flightModel
            .findOneAndUpdate(
                { _id: flightId, flightStatus: { $ne: FlightStatus.DELETE } },
                { flightStatus: FlightStatus.DELETE },
                { new: true },
            )
            .exec();
        if (!removed) throw new BadRequestException(Message.REMOVE_FAILED);

        return removed;
    }

    private validateFlightBusinessRules(input: {
        departureAirport?: string;
        arrivalAirport?: string;
        departureTime?: Date;
        arrivalTime?: Date;
    }): void {
        if (input.departureAirport && input.arrivalAirport && input.departureAirport === input.arrivalAirport) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }
        if (input.departureTime && input.arrivalTime) {
            const departure = new Date(input.departureTime).getTime();
            const arrival = new Date(input.arrivalTime).getTime();
            if (arrival <= departure) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }
    }

    private validateObjectId(id: string, key: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`${key} ${Message.BAD_REQUEST}`);
        }
    }
}
