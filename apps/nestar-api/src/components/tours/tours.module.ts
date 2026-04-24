import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeModule } from '../like/like.module';
import { MemberModule } from '../member/member.module';
import { ViewModule } from '../view/view.module';
import TourSchema from '../../schemas/Tour.model';
import { ToursResolver } from './tours.resolver';
import { ToursService } from './tours.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Tour', schema: TourSchema }]),
        LikeModule,
        MemberModule,
        ViewModule,
    ],
    providers: [ToursResolver, ToursService],
})
export class ToursModule { }
