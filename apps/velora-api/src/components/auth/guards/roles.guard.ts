import { BadRequestException, CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		const roles = this.reflector.get<string[]>('roles', context.getHandler());
		if (!roles) return true;

		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;
			const bearerToken = request.headers.authorization;
			if (!bearerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			if (!bearerToken.startsWith('Bearer ')) throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

			const token = bearerToken.split(' ')[1],
				authMember = await this.authService.verifyToken(token);

			if (!authMember) throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

			const hasPermission = roles.includes(authMember.memberType);
			if (!hasPermission) throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

			request.body.authMember = authMember;
			return true;
		}
		return false;
		// description => http, rpc, gprs and etc are ignored
	}
}
