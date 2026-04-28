import { ObjectId, Types } from 'mongoose';

export interface T {
	[key: string]: any;
}

export interface StatisticModifier {
	_id: Types.ObjectId | ObjectId | string;
	targetKey: string;
	modifier: number;
}
