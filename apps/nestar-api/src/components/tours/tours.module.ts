import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import TourSchema from '../../schemas/Tour.model';
import { ToursResolver } from './tours.resolver';
import { ToursService } from './tours.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Tour', schema: TourSchema }]),
    ],
    providers: [ToursResolver, ToursService],
})
export class ToursModule { }
