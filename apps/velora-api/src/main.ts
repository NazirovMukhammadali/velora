import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';

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
	app.use('/uploads', express.static('./uploads'));

	app.useWebSocketAdapter(new WsAdapter(app));
	await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
