import { Schema } from 'mongoose';
import { TourStatus } from '../libs/enums/tour.enum';

const TourSchema = new Schema(
	{
		tourTitle: {
			type: String,
			required: true,
		},

		tourLocation: {
			type: String,
			required: true,
		},

		tourDays: {
			type: Number,
			required: true,
			min: 1,
		},

		tourNights: {
			type: Number,
			default: 0,
			min: 0,
		},

		tourPrice: {
			type: Number,
			required: true,
			min: 0,
		},

		tourImages: {
			type: [String],
			required: true,
		},

		tourDesc: {
			type: String,
		},

		tourStatus: {
			type: String,
			enum: TourStatus,
			default: TourStatus.ACTIVE,
		},

		tourLikes: {
			type: Number,
			default: 0,
		},

		tourViews: {
			type: Number,
			default: 0,
		},

		tourComments: {
			type: Number,
			default: 0,
		},

		tourRank: {
			type: Number,
			default: 0,
		},

		tourSoldCount: {
			type: Number,
			default: 0,
			min: 0,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'tours' },
);

TourSchema.index({ memberId: 1, tourStatus: 1, createdAt: -1 });
TourSchema.index({ tourStatus: 1, tourLocation: 1, tourPrice: 1 });
TourSchema.index({ tourStatus: 1, tourSoldCount: -1, createdAt: -1 });

export default TourSchema;
