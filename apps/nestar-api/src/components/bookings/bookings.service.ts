import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Booking, Bookings } from '../../libs/dto/booking/booking';
import { BookingInquiry, BookingUpdateStatusByAdminInput, CreateTourBookingInput } from '../../libs/dto/booking/booking.input';
import { BookingStatus, BookingType } from '../../libs/enums/booking.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { Tour } from '../../libs/dto/tour/tour';
import { TourStatus } from '../../libs/enums/tour.enum';
import { T } from '../../libs/types/common';

@Injectable()
export class BookingsService {
    constructor(
        @InjectModel('Booking') private readonly bookingModel: Model<Booking>,
        @InjectModel('Tour') private readonly tourModel: Model<Tour>,
    ) { }

    public async createTourBooking(memberId: Types.ObjectId, input: CreateTourBookingInput): Promise<Booking> {
        const tourId = shapeIntoMongoObjectId(input.tourId);
        const targetTour = await this.tourModel
            .findOne({
                _id: tourId,
                tourStatus: TourStatus.ACTIVE,
            })
            .lean()
            .exec();

        if (!targetTour) throw new NotFoundException(Message.NO_DATA_FOUND);

        try {
            return await this.bookingModel.create({
                bookingType: BookingType.TOUR,
                bookingStatus: BookingStatus.CONFIRMED,
                bookingRefId: tourId,
                memberId,
                agentId: targetTour.memberId,
                bookingTitle: targetTour.tourTitle,
                bookingPrice: targetTour.tourPrice,
            });
        } catch (err) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getMyTourBookings(memberId: Types.ObjectId, input: BookingInquiry): Promise<Bookings> {
        const match: T = {
            memberId,
            bookingType: BookingType.TOUR,
        };
        if (input.bookingStatus) match.bookingStatus = input.bookingStatus;

        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
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

        const result = await this.bookingModel.aggregate(pipeline).exec();
        return result?.[0] ?? { list: [], metaCounter: [{ total: 0 }] };
    }

    public async hasConfirmedOrPaidTourBooking(memberId: Types.ObjectId, agentId: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(agentId)) {
            throw new BadRequestException(`agentId ${Message.BAD_REQUEST}`);
        }

        const count = await this.bookingModel.countDocuments({
            memberId,
            agentId: shapeIntoMongoObjectId(agentId),
            bookingType: BookingType.TOUR,
            bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.PAID] },
        });
        return count > 0;
    }

    public async updateBookingStatusByAdmin(input: BookingUpdateStatusByAdminInput): Promise<Booking> {
        const result = await this.bookingModel
            .findOneAndUpdate(
                { _id: input._id, bookingType: BookingType.TOUR },
                { bookingStatus: input.bookingStatus },
                { new: true },
            )
            .exec();
        if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

        return result;
    }
}
