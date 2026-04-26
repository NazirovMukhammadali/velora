import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeModule } from '../like/like.module';
import { ViewModule } from '../view/view.module';
import RentcarSchema from '../../schemas/Rentcar.model';
import { RentcarResolver } from './rentcar.resolver';
import { RentcarService } from './rentcar.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Rentcar', schema: RentcarSchema }]),
        LikeModule,
        ViewModule,
    ],
    providers: [RentcarResolver, RentcarService],
})
export class RentcarModule {}
