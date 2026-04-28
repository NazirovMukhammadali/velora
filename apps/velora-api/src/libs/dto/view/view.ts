import { Field, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ViewGroup } from '../../enums/view.enum';

@ObjectType()
export class View {
    @Field(() => String)
    _id: Types.ObjectId;

    @Field(() => ViewGroup)
    viewGroup: ViewGroup;

    @Field(() => String)
    viewRefId: Types.ObjectId;

    @Field(() => String)
    memberId: Types.ObjectId;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;
}