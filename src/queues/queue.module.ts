import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { EnvService } from '@/config/config.service';
import { createIORedisFromUpstash } from './redis.adapter';
import { QuestionGenerationProcessor } from './processors/question-generation.processor';
import { AudioProcessingProcessor } from './processors/audio-processing.processor';
import { IntegrationRegistry } from '@/integrations';
import { DatabaseModule } from '@/database/db.module';

export const QUESTION_GENERATION_QUEUE = 'question-generation';
export const AUDIO_PROCESSING_QUEUE = 'audio-processing';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
        BullModule.forRootAsync({
            inject: [EnvService],
            useFactory: (configService: EnvService) => {
                const upstashUrl = configService.get('UPSTASH_REDIS_REST_URL')!;
                const upstashToken = configService.get('UPSTASH_REDIS_REST_TOKEN')!;

                return {
                    createClient: () => {
                        return createIORedisFromUpstash(upstashUrl, upstashToken);
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
        BullModule.registerQueue(
            { name: QUESTION_GENERATION_QUEUE },
            { name: AUDIO_PROCESSING_QUEUE },
        ),
    ],
    providers: [QuestionGenerationProcessor, AudioProcessingProcessor, IntegrationRegistry],
    exports: [BullModule],
})
export class QueueModule { }
