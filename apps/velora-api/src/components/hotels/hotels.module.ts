import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeModule } from '../like/like.module';
import { ViewModule } from '../view/view.module';
import HotelSchema from '../../schemas/Hotel.model';
import { HotelsResolver } from './hotels.resolver';
import { HotelsService } from './hotels.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Hotel', schema: HotelSchema }]), LikeModule, ViewModule],
	providers: [HotelsResolver, HotelsService],
})
export class HotelsModule {}
