import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { EnvService } from '@/config/env/config.service';
import { createIORedisFromUpstash } from './redis.adapter';
import { QuestionGenerationProcessor } from './processors/question-generation.processor';
import { AudioProcessingProcessor } from './processors/audio-processing.processor';
import { IntegrationModule } from '@/integrations/integration.module';
import { DatabaseModule } from '@/database/db.module';

export const QUESTION_GENERATION_QUEUE = 'question-generation';
export const AUDIO_PROCESSING_QUEUE = 'audio-processing';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
        IntegrationModule,
        BullModule.forRootAsync({
            inject: [EnvService],
            useFactory: (configService: EnvService) => {
                const redisPassword = configService.get('REDIS_PASSWORD')!;
                const redisHost = configService.get('REDIS_HOST')!;
                const redisPort = configService.get('REDIS_PORT')!;
                return {
                    createClient: () => {
                        return createIORedisFromUpstash({
                            host: redisHost,
                            port: redisPort,
                            password: redisPassword,
                        });
                    },
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                        removeOnComplete: 100,
                        removeOnFail: 500,
                    },
                };
            },
        }),
        BullModule.registerQueue({ name: QUESTION_GENERATION_QUEUE }, { name: AUDIO_PROCESSING_QUEUE }),
    ],
    providers: [QuestionGenerationProcessor, AudioProcessingProcessor],
    exports: [BullModule],
})
export class QueueModule {}
