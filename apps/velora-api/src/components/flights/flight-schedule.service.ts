import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Flight } from '../../libs/dto/flight/flight';
import { FlightStatus } from '../../libs/enums/flight.enum';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Flights leaving sooner than this are treated as gone and rolled forward. */
const BOOKING_CUTOFF_MS = 3 * 60 * 60 * 1000;

/**
 * Keeps the flight catalog bookable without manual re-seeding: active flights that have
 * departed move forward by whole weeks (same weekday / time, like a weekly airline schedule).
 */
@Injectable()
export class FlightScheduleService implements OnApplicationBootstrap {
	private readonly logger = new Logger(FlightScheduleService.name);

	constructor(@InjectModel('Flight') private readonly flightModel: Model<Flight>) {}

	public async onApplicationBootstrap(): Promise<void> {
		await this.rollDepartedFlights();
	}

	@Cron('0 5 0 * * *', { name: 'ROLL_DEPARTED_FLIGHTS' })
	public async rollDepartedFlights(now: Date = new Date()): Promise<number> {
		try {
			const cutoff = now.getTime() + BOOKING_CUTOFF_MS;
			const departed = await this.flightModel
				.find({ flightStatus: FlightStatus.ACTIVE, departureTime: { $lt: new Date(cutoff) } })
				.select('_id departureTime arrivalTime')
				.lean()
				.exec();
			if (departed.length === 0) return 0;

			const ops = departed.map((flight) => {
				const departure = new Date(flight.departureTime).getTime();
				const arrival = new Date(flight.arrivalTime).getTime();
				const weeks = Math.floor((cutoff - departure) / WEEK_MS) + 1;
				const shift = weeks * WEEK_MS;
				return {
					updateOne: {
						filter: { _id: flight._id, departureTime: flight.departureTime },
						update: { $set: { departureTime: new Date(departure + shift), arrivalTime: new Date(arrival + shift) } },
					},
				};
			});
			const result = await this.flightModel.bulkWrite(ops);
			this.logger.log(`Rolled ${result.modifiedCount} departed flight(s) forward`);
			return result.modifiedCount;
		} catch (err) {
			this.logger.error('Rolling departed flights failed', err as Error);
			return 0;
		}
	}
}
