import { GeminiIntegration, IntegrationRegistry } from '@/integrations';
import { Injectable, InternalServerErrorException, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as Database from '@/database';
import { questionQueue, questions, answerOptions, Question, AnswerOption, topics } from '@/database/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { QuestionStoreService } from './question-store.service';

interface ApprovalResult {
    queueId: string;
    success: boolean;
    message?: string;
    questionId?: string;
    jobId?: string;
    audioQueued?: boolean;
}

interface QuestionValidationResult {
    isValid: boolean;
    errors: string[];
}

interface QuestionOption {
    optionText: string;
    isCorrect: boolean;
    optionOrder: number;
}

@Injectable()
export class QuestionGenerationService {
    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
        @InjectQueue('audio-processing') private audioQueue: Queue,
        private questionStoreService: QuestionStoreService,
    ) {}

    /**
     * Validates question structure before approval.
     * Requirements 3.9: Each question must have exactly 4 options with exactly 1 correct answer.
     */
    private validateQuestionStructure(options: QuestionOption[] | unknown): QuestionValidationResult {
        const errors: string[] = [];

        // Check if options is an array
        if (!Array.isArray(options)) {
            return {
                isValid: false,
                errors: ['Question options must be an array'],
            };
        }

        // Check exactly 4 options exist
        if (options.length !== 4) {
            errors.push(`Question must have exactly 4 options, but has ${options.length}`);
        }

        // Count correct options
        const correctOptions = options.filter((opt) => opt?.isCorrect === true);
        if (correctOptions.length !== 1) {
            errors.push(`Question must have exactly 1 correct option, but has ${correctOptions.length}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    async generateQuestions(input: {
        prompt: string;
        topicId: string;
        model?: string;
        difficulty?: number;
        count?: number;
        language?: string;
        useRAG?: boolean; // Enable RAG for deduplication
    }) {
        const gemini = this.registry.get<GeminiIntegration>('gemini');

        if (!gemini) {
            throw new InternalServerErrorException('Gemini integration not found');
        }


        // Use RAG if enabled and store is ready
        const storeName = this.questionStoreService.getStoreName();

        let result = await gemini.generateQuestions({
            ...input,
            fileSearchStoreName: storeName!,
        });

        const queueIds: string[] = [];
        for (const res of result) {
            const [queue] = await this.db
                .insert(questionQueue)
                .values({
                    question: res,
                    answer_option: res.options,
                    is_approved: false,
                    is_rejected: false,
                    topicId: input.topicId,
                })
                .returning();

            queueIds.push(queue.id);
        }

        return {
            success: true,
            count: result.length,
            queueId: queueIds,
            questions: result,
            usedRAG: !!storeName && input.useRAG !== false,
        };
    }

    async approveQuestions(queueIds: string[], generateAudio: boolean = false) {
        const results: ApprovalResult[] = [];

        for (const queueId of queueIds) {
            try {
                // 1. Fetch Queue Item
                const [queueItem] = await this.db.select().from(questionQueue).where(eq(questionQueue.id, queueId));

                if (!queueItem) {
                    results.push({
                        queueId,
                        success: false,
                        message: 'Queue item not found',
                    });
                    continue;
                }

                const questionData = queueItem.question as Pick<
                    Question,
                    'questionText' | 'explanation' | 'difficulty' | 'points'
                > & {
                    options: Pick<AnswerOption, 'optionText' | 'isCorrect' | 'optionOrder'>[];
                };

                // 2. Validate question structure (Requirements 3.9)
                const validation = this.validateQuestionStructure(questionData.options);
                if (!validation.isValid) {
                    results.push({
                        queueId,
                        success: false,
                        message: `Invalid question structure: ${validation.errors.join('; ')}`,
                    });
                    continue;
                }

                // 3. Move to Live Questions Table (Transaction per item)
                let newQuestion;

                await this.db.transaction(async (tx) => {
                    const inserted = await tx
                        .insert(questions)
                        .values({
                            questionText: questionData.questionText,
                            explanation: questionData.explanation,
                            difficulty: questionData.difficulty,
                            points: questionData.points,
                            audioUrl: null,
                            topicId: queueItem.topicId,
                        })
                        .returning();

                    newQuestion = inserted[0];

                    // Insert Options
                    if (Array.isArray(questionData.options)) {
                        for (const opt of questionData.options) {
                            await tx.insert(answerOptions).values({
                                questionId: newQuestion.id,
                                optionText: opt.optionText,
                                isCorrect: opt.isCorrect,
                                optionOrder: opt.optionOrder,
                            });
                        }
                    }

                    // Update queue row with appropriate status
                    await tx
                        .update(questionQueue)
                        .set({
                            is_approved: true,
                            status: generateAudio ? 'pending_audio' : 'completed',
                            questionId: newQuestion.id,
                        })
                        .where(eq(questionQueue.id, queueId));
                });

                // Queue Audio Job only if generateAudio is true
                if (generateAudio !== false && newQuestion) {

                    await this.audioQueue.add(
                        {
                            queueId,
                            questionId: newQuestion.id,
                            questionText: questionData.questionText,
                        },
                        {
                            priority: 1,
                            removeOnComplete: true,
                        },
                    );
                }

                results.push({
                    queueId,
                    success: true,
                    questionId: newQuestion.id,
                    audioQueued: generateAudio,
                });
            } catch (err) {
                results.push({
                    queueId,
                    success: false,
                    message: err?.message ?? 'Unknown error',
                });
            }
        }

        // Sync approved questions to RAG store (fire and forget)
        const approvedCount = results.filter((r) => r.success).length;
        if (approvedCount > 0) {
            this.questionStoreService.syncQuestionsToStore().catch((err) => {
                console.error('[QuestionGen] Failed to sync to RAG store:', err.message);
            });
        }

        return {
            success: true,
            results,
            message: 'Batch approval complete',
            audioGeneration: generateAudio ? 'queued' : 'skipped',
        };
    }

    async rejectQuestion(queueId: string) {
        const [queueItem] = await this.db.select().from(questionQueue).where(eq(questionQueue.id, queueId));

        if (!queueItem) {
            throw new BadRequestException('Question not found in queue');
        }

        if (queueItem.is_approved) {
            throw new BadRequestException('Cannot reject an approved question');
        }

        await this.db.update(questionQueue).set({ is_rejected: true }).where(eq(questionQueue.id, queueId));

        return { success: true, message: 'Question rejected' };
    }

    async getPendingQuestions() {
        // Fetch questions that are neither approved nor rejected
        const pendingQuestions = await this.db
            .select({
                id: questionQueue.id,
                question: questionQueue.question,
                is_approved: questionQueue.is_approved,
                is_rejected: questionQueue.is_rejected,
                topicId: questionQueue.topicId,
                topicName: topics.name,
                status: questionQueue.status,
                jobId: questionQueue.jobId,
            })
            .from(questionQueue)
            .leftJoin(topics, eq(questionQueue.topicId, topics.id))
            .where(sql`${questionQueue.is_approved} = false AND ${questionQueue.is_rejected} = false`)
            .orderBy(questionQueue.createdAt);

        return {
            questions: pendingQuestions.map((q) => ({
                id: q.id,
                question: q.question,
                is_approved: q.is_approved,
                is_rejected: q.is_rejected,
                topicId: q.topicId,
                topicName: q.topicName,
                status: q.status,
                jobId: q.jobId,
            })),
        };
    }

    // async batchApproveQuestions(queueIds: string[]) {
    //     const results: any[] = [];
    //     for (const id of queueIds) {
    //         try {
    //             const result = await this.approveQuestion(id);
    //             results.push({ id, status: 'fulfilled', value: result });
    //         } catch (error) {
    //             results.push({ id, status: 'rejected', reason: error.message });
    //         }
    //     }
    //     return results;
    // }
    async updateQuestionVote(questionId: string, voteType: 'upvote' | 'downvote', reason?: string) {
        const question = await this.db.query.questions.findFirst({
            where: eq(questions.id, questionId),
        });

        if (!question) {
            throw new BadRequestException('Question not found');
        }

        if (voteType === 'upvote') {
            await this.db
                .update(questions)
                .set({ upvotes: sql`${questions.upvotes} + 1` })
                .where(eq(questions.id, questionId));
        } else {
            await this.db
                .update(questions)
                .set({ downvotes: sql`${questions.downvotes} + 1` })
                .where(eq(questions.id, questionId));

            // Ideally we would store the reason in a separate table
            if (reason) {
                console.log(`Question ${questionId} downvoted. Reason: ${reason}`);
            }
        }

        return { success: true };
    }

    /**
     * Sync audio for questions - picks questions with null audioUrl and queues them
     * Similar to RAG store sync but for audio generation
     */
    async syncAudioForQuestions(
        options: {
            topicId?: string;
            limit?: number;
        } = {},
    ) {
        const { topicId, limit = 50 } = options;

        // Build where conditions using proper Drizzle syntax
        const conditions = [isNull(questions.audioUrl), eq(questions.isActive, true)];

        if (topicId) {
            conditions.push(eq(questions.topicId, topicId));
        }

        const questionsToProcess = await this.db
            .select({ id: questions.id, questionText: questions.questionText })
            .from(questions)
            .where(and(...conditions))
            .limit(limit);

        if (questionsToProcess.length === 0) {
            return {
                success: true,
                message: 'All questions already have audio',
                queuedCount: 0,
                questionIds: [],
                remaining: 0,
            };
        }

        // Queue audio generation jobs
        const queuedIds: string[] = [];
        for (const q of questionsToProcess) {
            await this.audioQueue.add(
                {
                    questionId: q.id,
                    questionText: q.questionText,
                },
                {
                    priority: 2,
                    removeOnComplete: true,
                },
            );
            queuedIds.push(q.id);
        }

        // Get remaining count
        const remainingCount = await this.getQuestionsWithoutAudioCount(topicId);

        return {
            success: true,
            message: `Queued ${queuedIds.length} questions for audio generation`,
            queuedCount: queuedIds.length,
            questionIds: queuedIds,
            remaining: Math.max(0, remainingCount.count - queuedIds.length),
        };
    }

    /**
     * Get count of questions missing audio
     */
    async getQuestionsWithoutAudioCount(topicId?: string) {
        const conditions = [isNull(questions.audioUrl)];

        if (topicId) {
            conditions.push(eq(questions.topicId, topicId));
        }

        const result = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(questions)
            .where(and(...conditions));

        return {
            count: result[0]?.count ?? 0,
            topicId: topicId || null,
        };
    }
}
