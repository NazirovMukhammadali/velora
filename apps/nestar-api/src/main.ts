import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // app = express + nest
  app.useGlobalPipes(new ValidationPipe()); // 9 ~ 11 nestga tegishli
  app.useGlobalInterceptors(new LoggingInterceptor()); //req, res kir-chiq time // middleware grql
  app.enableCors({ origin: true, credentials: true }); // har qanday fayl uchun

  app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
  app.use('/uploads', express.static('./uploads'));

  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();
