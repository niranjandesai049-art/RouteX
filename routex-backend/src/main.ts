import * as dotenv from 'dotenv';
// Load environment variables from .env file before bootstrapping NestJS
dotenv.config();

import * as Sentry from '@sentry/nestjs';

// Initialize Sentry before bootstrapping NestJS
Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://placeholder@sentry.io/123456',
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development',
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppLogger } from './common/logger/winston-logger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: AppLogger,
  });

  // Enable Helmet for secure HTTP headers
  app.use(helmet());

  // Enable Rate Limiting middleware (limit requests to protect APIs from abuse)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Enable CORS with strict whitelist in production
  app.enableCors({
    origin: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',')
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Register the global HTTP logging and correlation interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable global validation pipe for request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Set global prefix for all API endpoints
  app.setGlobalPrefix('api');

  // Build Swagger OpenAPI documentation configuration
  const config = new DocumentBuilder()
    .setTitle('RouteX API')
    .setDescription(
      "India's AI-Powered Digital Freight Marketplace - Core Engine APIs",
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  AppLogger.log(`🚀 RouteX Server running on: http://localhost:${port}`);
  AppLogger.log(
    `📄 Swagger documentation hosted on: http://localhost:${port}/docs`,
  );
}
bootstrap();
