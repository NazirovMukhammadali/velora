import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { FlightsInquiry, FlightInput } from '../../libs/dto/flight/flight.input';
import { Flight, Flights } from '../../libs/dto/flight/flight';
import { Direction, Message } from '../../libs/enums/common.enum';
import { FlightStatus } from '../../libs/enums/flight.enum';

@Injectable()
export class FlightsService {
    constructor(
        @InjectModel('Flight') private readonly flightModel: Model<Flight>,
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
        if (!result?.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        return result[0];
    }
}
