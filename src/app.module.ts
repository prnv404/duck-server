// src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseModule } from './database/db.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from '@/modules/user/user.module';
import { CurriculumModule } from '@/modules/curriculum/curriculum.module';
import { QuestionModule } from '@/modules/question/question.module';
import { PracticeModule } from '@/modules/practice/practice.module';
import { GamificationModule } from '@/modules/gamification/gamification.module';
import { IntegrationModule } from './integrations/integration.module';
import { AppController } from './app.controller';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './config/auth/auth';

@Module({
    imports: [
        AppConfigModule,
        DatabaseModule,
        ThrottlerModule.forRoot([
            {
                ttl: 60000, // 60 seconds
                limit: 100, // 100 requests per minute (global default)
            },
        ]),
        AuthModule.forRoot({ auth }),
        IntegrationModule,
        UserModule,
        CurriculumModule,
        QuestionModule,
        PracticeModule,
        GamificationModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        {
            provide: APP_PIPE,
            useClass: ValidationPipe,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: RequestLoggerInterceptor,
        },
    ],
})
export class AppModule {}
