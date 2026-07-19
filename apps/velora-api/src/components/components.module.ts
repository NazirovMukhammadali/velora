import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { LikeModule } from './like/like.module';
import { ViewModule } from './view/view.module';
import { FollowModule } from './follow/follow.module';
import { FlightsModule } from './flights/flights.module';
import { HotelsModule } from './hotels/hotels.module';
import { RentcarModule } from './rentcar/rentcar.module';
import { ToursModule } from './tours/tours.module';
import { BookingsModule } from './bookings/bookings.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { BoardArticleModule } from './board-article/board-article.module';
import { NoticeModule } from './notice/notice.module';

@Module({
	imports: [
		MemberModule,
		AuthModule,
		CommentModule,
		LikeModule,
		ViewModule,
		FollowModule,
		FlightsModule,
		ToursModule,
		HotelsModule,
		RentcarModule,
		BookingsModule,
		ChatbotModule,
		BoardArticleModule,
		NoticeModule,
	],
})
export class ComponentsModule {}
