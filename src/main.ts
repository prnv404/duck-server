import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: false, // Required for Better Auth
    });

    // Enable CORS
    app.enableCors({
        origin: true,
        credentials: true,
    });

    // Security middleware
    app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

    // Cookie parser - required for Better Auth
    app.use(cookieParser());

    // Body parsers for non-auth routes
    // Better Auth handles body parsing for /auth/* routes internally
    app.use((req, res, next) => {
        if (req.path.startsWith('/auth')) {
            return next();
        }
        json({ limit: '10mb' })(req, res, next);
    });
    app.use((req, res, next) => {
        if (req.path.startsWith('/auth')) {
            return next();
        }
        urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });

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
    // app.setGlobalPrefix('api/v1', {
    //     exclude: ['/'],
    // });

    await app.listen(process.env.PORT ?? 3000);
    console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
    console.log(`🔌 REST API base: http://localhost:${process.env.PORT ?? 3000}/api/v1`);
}

bootstrap();
