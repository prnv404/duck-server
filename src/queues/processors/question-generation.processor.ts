import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Inject } from '@nestjs/common';
import * as Database from '@/database';
import { questionQueue as questionQueueSchema, topics } from '@/database/schema';
import { GeminiIntegration, IntegrationRegistry } from '@/integrations';
import { GenerateQuestionsJob } from '../job.types';
import { eq } from 'drizzle-orm';

@Processor('question-generation')
@Injectable()
export class QuestionGenerationProcessor {
    private readonly logger = new Logger(QuestionGenerationProcessor.name);

    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) { }

    @Process({
        concurrency: 1,
    })
    async handleQuestionGeneration(job: Job<GenerateQuestionsJob>) {
        this.logger.log(`Processing question generation job ${job.id}`);

        const { prompt, topicId, model, difficulty, count, language, examType } = job.data;

        try {
            // Get Gemini integration
            const gemini = this.registry.get<GeminiIntegration>('gemini');
            if (!gemini) {
                throw new Error('Gemini integration not available');
            }

            // Generate questions with language and examType (Requirements: 3.1, 3.2, 3.3)
            const generatedQuestions = await gemini.generateQuestions({
                prompt,
                model,
                difficulty,
                count,
                language,
                examType,
            });

            this.logger.log(`Generated ${generatedQuestions.length} questions`);

            // Store in queue and trigger audio processing
            const queueIds: string[] = [];

            for (let i = 0; i < generatedQuestions.length; i++) {
                const question = generatedQuestions[i];

                // Insert into question queue
                const [queueItem] = await this.db
                    .insert(questionQueueSchema)
                    .values({
                        question: question,
                        answer_option: question.options,
                        is_approved: false,
                        is_rejected: false,
                        topicId: topicId,
                        jobId: job.id.toString(),
                        status: 'pending', // Waiting for approval
                        attemptCount: 0,
                    })
                    .returning();

                queueIds.push(queueItem.id);

                // Update progress
                await job.progress(((i + 1) / generatedQuestions.length) * 100);

                // Update progress
                await job.progress(((i + 1) / generatedQuestions.length) * 100);
            }

            this.logger.log(`Queued ${queueIds.length} questions for audio processing`);

            return {
                success: true,
                count: queueIds.length,
                queueIds,
            };
        } catch (error) {
            this.logger.error(`Question generation failed: ${error.message}`, error.stack);

            // Update all related queue items with error
            await this.db
                .update(questionQueueSchema)
                .set({
                    status: 'failed',
                    errorMessage: error.message,
                    attemptCount: job.attemptsMade,
                })
                .where(eq(questionQueueSchema.jobId, job.id.toString()));

            throw error;
        }
    }
}
