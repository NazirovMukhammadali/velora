import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Member } from '../../libs/dto/member/member';
import { T } from '../../libs/types/common';
import { JwtService } from '@nestjs/jwt';
import { shapeIntoMongoObjectId } from '../../libs/config';


@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    public async hashPassword(memberPassword: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        return await bcrypt.hash(memberPassword, salt);
    }

    public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }

    public async createToken(member: Member): Promise<string> {
        const source = member['_doc'] ? member['_doc'] : member;
        const payload: T = {
            _id: source._id,
            memberType: source.memberType,
            memberStatus: source.memberStatus,
            memberAuthType: source.memberAuthType,
            memberPhone: source.memberPhone,
            memberNick: source.memberNick,
            memberFullName: source.memberFullName,
            memberImage: source.memberImage,
        };

        return await this.jwtService.signAsync(payload);
    }

    public async verifyToken(token: string): Promise<Member> {
        const member = await this.jwtService.verifyAsync(token);
        member._id = shapeIntoMongoObjectId(member._id);
        return member;
    }
}