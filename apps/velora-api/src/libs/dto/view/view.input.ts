import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';
import { ViewGroup } from '../../enums/view.enum';

@InputType()
export class ViewInput {
	@IsNotEmpty()
	@Field(() => String)
	memberId: Types.ObjectId;

	@IsNotEmpty()
	@Field(() => String)
	viewRefId: Types.ObjectId;

	@IsNotEmpty()
	@Field(() => ViewGroup)
	viewGroup: ViewGroup;
}
