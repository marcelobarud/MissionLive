import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { parseCorsOrigins } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  const webOrigin = config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173';
  const corsOrigins = parseCorsOrigins(config.get<string>('CORS_ORIGINS'), webOrigin);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(config.get<number>('PORT') ?? 3000, config.get<string>('API_HOST') ?? '127.0.0.1');
}

void bootstrap();
