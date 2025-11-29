import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
        origin: true, 
        credentials: true,
    });

    // Security middleware
    app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

    // Body parsers
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, 
            forbidNonWhitelisted: false, 
            transform: true, 
            transformOptions: {
                enableImplicitConversion: true, 
            },
        }),
    );

    // Set global prefix for REST API
    app.setGlobalPrefix('api/v1', {
        exclude: ['/'], 
    });

    await app.listen(process.env.PORT ?? 3000);
    console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
    console.log(`🔌 REST API base: http://localhost:${process.env.PORT ?? 3000}/api/v1`);
}

bootstrap();
