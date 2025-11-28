// src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { GraphqlConfigModule } from './graphql.module';
import { DatabaseModule } from './database/db.module';
import { ComplexityPlugin } from './common/graphql/plugins/complexity.plugin';
import { LoggingPlugin } from './common/graphql/plugins/logging.plugin';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { RabbitMQModule } from './common/queue/rabbitmq.module';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DataLoaderInterceptor } from './common/dataloader/dataloader.interceptor';
import { UserModule } from '@/modules/user/user.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { TopicModule } from '@/modules/curriculum/topic.module';
import { QuestionModule } from '@/modules/question/question.module';
import { QuizModule } from '@/modules/practice/practice.module';
import { GamificationModule } from '@/modules/gamification/gamification.module';

@Module({
    imports: [
        AppConfigModule,
        DatabaseModule,
        TerminusModule,
        // RabbitMQModule,
        GraphqlConfigModule,
        ThrottlerModule.forRoot([
            {
                ttl: 60000,
                limit: 10,
            },
        ]),
        UserModule,
        AuthModule,
        TopicModule,
        QuestionModule,
        QuizModule,
        GamificationModule,
    ],
    controllers: [],
    providers: [
        AppService,
        ComplexityPlugin,
        LoggingPlugin,
        {
            provide: APP_FILTER,
            useClass: GraphqlExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: DataLoaderInterceptor,
        },
        {
            provide: APP_PIPE,
            useClass: ValidationPipe,
        },
        // {
        //     provide: APP_GUARD,
        //     useClass: ThrottlerGuard,
        // },
    ],
})
export class AppModule { }
