import { Schema } from 'mongoose';
import { HotelStatus } from '../libs/enums/hotel.enum';

const HotelSchema = new Schema(
	{
		hotelName: {
			type: String,
			required: true,
		},

		hotelLocation: {
			type: String,
			required: true,
		},

		hotelAddress: {
			type: String,
			required: true,
		},

		hotelPrice: {
			type: Number,
			required: true,
			min: 0,
		},

		hotelStars: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},

		availableRooms: {
			type: Number,
			default: 0,
			min: 0,
		},

		hotelImages: {
			type: [String],
			required: true,
		},

		hotelDesc: {
			type: String,
		},

		hotelStatus: {
			type: String,
			enum: HotelStatus,
			default: HotelStatus.ACTIVE,
		},

		hotelLikes: {
			type: Number,
			default: 0,
		},

		hotelViews: {
			type: Number,
			default: 0,
		},

		hotelComments: {
			type: Number,
			default: 0,
		},

		hotelRank: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true, collection: 'hotels' },
);

HotelSchema.index({ hotelStatus: 1, hotelLocation: 1, hotelPrice: 1 });

export default HotelSchema;
