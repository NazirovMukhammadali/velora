import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { WithoutGuard } from './guards/without.guard';

@Module({
	imports: [
		ConfigModule,
		HttpModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const secret = configService.get<string>('SECRET_TOKEN');

				if (!secret) {
					throw new Error('SECRET_TOKEN is missing in environment variables');
				}

				return {
					secret,
					signOptions: { expiresIn: '30d' },
				};
			},
		}),
	],
	providers: [AuthService, AuthGuard, RolesGuard, WithoutGuard],
	exports: [AuthService, AuthGuard, RolesGuard, WithoutGuard],
})
export class AuthModule {}
