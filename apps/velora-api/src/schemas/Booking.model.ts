import { Schema } from 'mongoose';
import { BookingStatus, BookingType } from '../libs/enums/booking.enum';

const BookingSchema = new Schema(
	{
		bookingType: {
			type: String,
			enum: BookingType,
			required: true,
		},

		bookingStatus: {
			type: String,
			enum: BookingStatus,
			default: BookingStatus.PENDING,
		},

		bookingRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		agentId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		bookingTitle: {
			type: String,
			required: true,
		},

		bookingPrice: {
			type: Number,
			required: true,
			min: 0,
		},
	},
	{ timestamps: true, collection: 'bookings' },
);

BookingSchema.index({ memberId: 1, bookingType: 1, bookingStatus: 1, createdAt: -1 });
BookingSchema.index({ agentId: 1, bookingType: 1, bookingStatus: 1, createdAt: -1 });
BookingSchema.index({ bookingRefId: 1, bookingType: 1 });

export default BookingSchema;
