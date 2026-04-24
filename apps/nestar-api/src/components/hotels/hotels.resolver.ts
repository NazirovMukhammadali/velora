import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Hotel, Hotels } from '../../libs/dto/hotel/hotel';
import { AllHotelsInquiry, HotelInput, HotelsInquiry } from '../../libs/dto/hotel/hotel.input';
import { HotelUpdate } from '../../libs/dto/hotel/hotel.update';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { HotelsService } from './hotels.service';

@Resolver()
export class HotelsResolver {
    constructor(private readonly hotelsService: HotelsService) { }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Hotel)
    public async createHotel(
        @Args('input') input: HotelInput,
    ): Promise<Hotel> {
        return await this.hotelsService.createHotel(input);
    }

    @Query(() => Hotels)
    public async getHotels(
        @Args('input') input: HotelsInquiry,
    ): Promise<Hotels> {
        return await this.hotelsService.getHotels(input);
    }

    @UseGuards(WithoutGuard)
    @Query(() => Hotel)
    public async getHotelDetail(
        @Args('hotelId', { type: () => ID }) hotelId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Hotel> {
        return await this.hotelsService.getHotelDetail(memberId, hotelId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Hotel)
    public async likeTargetHotel(
        @Args('hotelId', { type: () => ID }) hotelId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Hotel> {
        return await this.hotelsService.likeTargetHotel(memberId, shapeIntoMongoObjectId(hotelId));
    }

    @UseGuards(AuthGuard)
    @Query(() => Hotels)
    public async getFavoriteHotels(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Hotels> {
        return await this.hotelsService.getFavoriteHotels(memberId, input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Query(() => Hotels)
    public async getAllHotelsByAdmin(
        @Args('input') input: AllHotelsInquiry,
    ): Promise<Hotels> {
        return await this.hotelsService.getAllHotelsByAdmin(input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Hotel)
    public async updateHotelByAdmin(
        @Args('input') input: HotelUpdate,
    ): Promise<Hotel> {
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.hotelsService.updateHotelByAdmin(input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Hotel)
    public async removeHotelByAdmin(
        @Args('hotelId', { type: () => ID }) hotelId: string,
    ): Promise<Hotel> {
        return await this.hotelsService.removeHotelByAdmin(shapeIntoMongoObjectId(hotelId));
    }
}
