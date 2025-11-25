import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: '10mb' })); // Parse JSON bodies
    app.use(urlencoded({ extended: true, limit: '10mb' }));
    app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
