import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as Database from '@/database';
import { questionQueue as questionQueueSchema } from '@/database/schema';
import { GeminiIntegration, IntegrationRegistry } from '@/integrations';
import { GenerateQuestionsJob } from '../job.types';
import { eq } from 'drizzle-orm';
import { QuestionStoreService } from '@/modules/question/question-store.service';

@Processor('question-generation')
@Injectable()
export class QuestionGenerationProcessor {
    private readonly logger = new Logger(QuestionGenerationProcessor.name);

    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
        private questionStoreService: QuestionStoreService,
    ) { }

    @Process({
        concurrency: 1,
    })
    async handleQuestionGeneration(job: Job<GenerateQuestionsJob>) {
        this.logger.log(`Processing question generation job ${job.id}`);

        const { prompt, topicId, model, difficulty, count, language, useRAG } = job.data;

        try {
            // Get Gemini integration
            const gemini = this.registry.get<GeminiIntegration>('gemini');
            if (!gemini) {
                throw new Error('Gemini integration not available');
            }

            // Use RAG if enabled and store is ready
            const storeName = this.questionStoreService.getStoreName();
            console.log(
                'file name', storeName
            )
            const useFileSearch = useRAG && storeName && this.questionStoreService.isReady();

            if (useRAG && !useFileSearch) {
                this.logger.warn('RAG requested but store not ready, generating without deduplication');
            }

            const generatedQuestions = await gemini.generateQuestions({
                prompt,
                model,
                difficulty,
                count,
                language,
                fileSearchStoreName: useFileSearch ? storeName : undefined,
            });

            this.logger.log(`Generated ${generatedQuestions.length} questions`);

            if (!generatedQuestions || generatedQuestions.length === 0) {
                this.logger.warn('No questions were generated');
                return {
                    success: false,
                    count: 0,
                    queueIds: [],
                    message: 'No questions generated',
                };
            }

            // Store in queue
            const queueIds: string[] = [];

            const uploadQuestions: any[] = []

            for (let i = 0; i < generatedQuestions.length; i++) {
                const question = generatedQuestions[i];
                uploadQuestions.push(question)
                try {
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
                    this.logger.debug(`Inserted question ${i + 1}/${generatedQuestions.length} with ID: ${queueItem.id}`);


                    // Update progress
                    await job.progress(((i + 1) / generatedQuestions.length) * 100);
                } catch (insertError) {
                    this.logger.error(`Failed to insert question ${i + 1}: ${insertError.message}`, insertError.stack);
                    throw insertError;
                }
            }

            this.logger.log(`Successfully queued ${queueIds.length} questions`);
            await this.questionStoreService.uploadQuestions(uploadQuestions)
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
