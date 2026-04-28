import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { CommentStatus } from '../../enums/comment.enum';
import { Types } from 'mongoose';

@InputType()
export class CommentUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: Types.ObjectId;

	@IsOptional()
	@Field(() => CommentStatus, { nullable: true })
	commentStatus?: CommentStatus;

	@IsOptional()
	@Length(1, 100)
	@Field(() => String, { nullable: true })
	commentContent?: string;

	@IsOptional()
	@Min(1)
	@Max(5)
	@Field(() => Int, { nullable: true })
	commentRating?: number;
}
