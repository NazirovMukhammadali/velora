import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { UPLOADS_STATIC_OPTIONS, ensureUploadsRoot } from './libs/upload/upload.security';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const isProduction = process.env.NODE_ENV === 'production';
	const corsOriginList = (process.env.CORS_ORIGINS ?? '')
		.split(',')
		.map((origin) => origin.trim())
		.filter((origin) => Boolean(origin));

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);
	app.useGlobalInterceptors(new LoggingInterceptor());
	app.enableCors({
		origin: isProduction ? (corsOriginList.length ? corsOriginList : false) : true,
		credentials: true,
	});

	app.use(graphqlUploadExpress({ maxFileSize: 5 * 1024 * 1024, maxFiles: 10 }));
	// Same directory the upload flow writes to; created on boot so a fresh deploy/volume serves immediately.
	const uploadsRoot = ensureUploadsRoot();
	app.use('/uploads', express.static(uploadsRoot, UPLOADS_STATIC_OPTIONS));
	const logger = new Logger('Bootstrap');
	logger.log(`Serving uploads from ${uploadsRoot}`);
	if (isProduction && !process.env.UPLOADS_DIR) {
		logger.warn('UPLOADS_DIR is not set — uploaded images live inside the app directory and are lost on redeploy');
	}

	await app.listen(process.env.PORT ?? 3003);
}
bootstrap();
