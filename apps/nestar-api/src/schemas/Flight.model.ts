import { Schema } from 'mongoose';
import { FlightCabinClass, FlightStatus } from '../libs/enums/flight.enum';

const FlightSchema = new Schema(
    {
        airline: {
            type: String,
            required: true,
        },

        flightNumber: {
            type: String,
            required: true,
        },

        departureAirport: {
            type: String,
            required: true,
        },

        arrivalAirport: {
            type: String,
            required: true,
        },

        departureTime: {
            type: Date,
            required: true,
        },

        arrivalTime: {
            type: Date,
            required: true,
        },

        cabinClass: {
            type: String,
            enum: FlightCabinClass,
            required: true,
        },

        availableSeats: {
            type: Number,
            default: 0,
        },

        basePrice: {
            type: Number,
            required: true,
        },

        flightStatus: {
            type: String,
            enum: FlightStatus,
            default: FlightStatus.ACTIVE,
        },

        flightLikes: {
            type: Number,
            default: 0,
        },

        flightViews: {
            type: Number,
            default: 0,
        },

        flightComments: {
            type: Number,
            default: 0,
        },

        flightRank: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true, collection: 'flights' },
);

FlightSchema.index(
    { flightNumber: 1, departureTime: 1, cabinClass: 1 },
    { unique: true },
);

export default FlightSchema;
