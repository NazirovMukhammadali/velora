import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import BoardArticleSchema from '../../schemas/BoardArticle.model';
import { AuthModule } from '../auth/auth.module';
import { LikeModule } from '../like/like.module';
import { MemberModule } from '../member/member.module';
import { ViewModule } from '../view/view.module';
import { BoardArticleResolver } from './board-article.resolver';
import { BoardArticleService } from './board-article.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'BoardArticle', schema: BoardArticleSchema }]),
		AuthModule,
		MemberModule,
		LikeModule,
		ViewModule,
	],
	providers: [BoardArticleResolver, BoardArticleService],
	exports: [BoardArticleService],
})
export class BoardArticleModule {}
