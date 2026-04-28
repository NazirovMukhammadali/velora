import { Schema } from 'mongoose';
import { RentcarCategory, RentcarStatus, TransmissionType } from '../libs/enums/rentcar.enum';

const RentcarSchema = new Schema(
	{
		carTitle: {
			type: String,
			required: true,
		},

		carLocation: {
			type: String,
			required: true,
		},

		carCategory: {
			type: String,
			enum: RentcarCategory,
			required: true,
		},

		transmission: {
			type: String,
			enum: TransmissionType,
			default: TransmissionType.AUTOMATIC,
		},

		seats: {
			type: Number,
			required: true,
			min: 1,
		},

		dailyPrice: {
			type: Number,
			required: true,
			min: 0,
		},

		availableCars: {
			type: Number,
			default: 0,
			min: 0,
		},

		carImages: {
			type: [String],
			required: true,
		},

		carDesc: {
			type: String,
		},

		rentcarStatus: {
			type: String,
			enum: RentcarStatus,
			default: RentcarStatus.ACTIVE,
		},

		rentcarLikes: {
			type: Number,
			default: 0,
		},

		rentcarViews: {
			type: Number,
			default: 0,
		},

		rentcarComments: {
			type: Number,
			default: 0,
		},

		rentcarRank: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true, collection: 'rentcars' },
);

RentcarSchema.index({ rentcarStatus: 1, carLocation: 1, dailyPrice: 1, carCategory: 1 });

export default RentcarSchema;
