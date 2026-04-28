import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { Types } from 'mongoose';
import { TourStatus } from '../../enums/tour.enum';

@InputType()
export class TourUpdate {
    @IsNotEmpty()
    @Field(() => String)
    _id: Types.ObjectId;

    @IsOptional()
    @Length(3, 120)
    @Field(() => String, { nullable: true })
    tourTitle?: string;

    @IsOptional()
    @Length(2, 100)
    @Field(() => String, { nullable: true })
    tourLocation?: string;

    @IsOptional()
    @Min(1)
    @Field(() => Int, { nullable: true })
    tourDays?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    tourNights?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    tourPrice?: number;

    @IsOptional()
    @Field(() => [String], { nullable: true })
    tourImages?: string[];

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, { nullable: true })
    tourDesc?: string;

    @IsOptional()
    @Field(() => TourStatus, { nullable: true })
    tourStatus?: TourStatus;
}
