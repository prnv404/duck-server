import { GeminiIntegration, IntegrationRegistry, StorageIntegration } from '@/integrations';
import { Injectable, InternalServerErrorException, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as Database from '@/database';
import { questionQueue, questions, answerOptions, Question, AnswerOption } from '@/database/schema';
import { eq, sql, gt } from 'drizzle-orm';

@Injectable()
export class QuestionGenerationService {
    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
        @InjectQueue('audio-processing') private audioQueue: Queue,
    ) { }

    async generateQuestions(input: { prompt: string; topicId: string; model?: string; difficulty?: number; count?: number }) {
        const gemini = this.registry.get<GeminiIntegration>('gemini');

        if (!gemini) {
            throw new InternalServerErrorException('Gemini integration not found');
        }

        const result = await gemini.generateQuestions(input);
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
        };
    }

    async approveQuestion(queueId: string) {
        // 1. Fetch from Queue
        const [queueItem] = await this.db.select().from(questionQueue).where(eq(questionQueue.id, queueId));

        if (!queueItem) {
            throw new BadRequestException('Question not found in queue');
        }

        if (queueItem.is_approved) {
            throw new BadRequestException('Question already approved');
        }

        const questionData = queueItem.question as Pick<Question, 'questionText' | 'explanation' | 'difficulty' | 'points'> & {
            options: Pick<AnswerOption, 'optionText' | 'isCorrect' | 'optionOrder'>[];
        };

        // 2. Move to Questions Table
        await this.db.transaction(async (tx) => {
            const [newQuestion] = await tx
                .insert(questions)
                .values({
                    questionText: questionData.questionText,
                    explanation: questionData.explanation,
                    difficulty: questionData.difficulty,
                    points: questionData.points,
                    audioUrl: null, // Will be updated by audio processor
                    topicId: queueItem.topicId,
                })
                .returning();

            if (questionData.options && Array.isArray(questionData.options)) {
                for (const opt of questionData.options) {
                    await tx.insert(answerOptions).values({
                        questionId: newQuestion.id,
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect,
                        optionOrder: opt.optionOrder,
                    });
                }
            }

            // Update queue status
            await tx
                .update(questionQueue)
                .set({
                    is_approved: true,
                    status: 'pending_audio',
                    questionId: newQuestion.id,
                })
                .where(eq(questionQueue.id, queueId));
        });

        // 3. Queue Audio Generation
        const job = await this.audioQueue.add(
            {
                queueId: queueItem.id,
                questionText: questionData.questionText,
            },
            {
                priority: 1,
                removeOnComplete: true,
            },
        );

        return {
            success: true,
            questionId: queueId,
            jobId: job.id.toString(),
            message: 'Question approved and audio generation queued',
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

        await this.db
            .update(questionQueue)
            .set({ is_rejected: true })
            .where(eq(questionQueue.id, queueId));

        return { success: true, message: 'Question rejected' };
    }

    async getPendingQuestions() {
        // Fetch questions that are neither approved nor rejected
        const pendingQuestions = await this.db
            .select()
            .from(questionQueue)
            .where(
                sql`${questionQueue.is_approved} = false AND ${questionQueue.is_rejected} = false`
            )
            .orderBy(questionQueue.createdAt);

        return {
            questions: pendingQuestions.map((q) => ({
                id: q.id,
                is_approved: q.is_approved,
                is_rejected: q.is_rejected,
                topicId: q.topicId,
                status: q.status,
                jobId: q.jobId,
            })),
        };
    }

    async batchApproveQuestions(queueIds: string[]) {
        const results: any[] = [];
        for (const id of queueIds) {
            try {
                const result = await this.approveQuestion(id);
                results.push({ id, status: 'fulfilled', value: result });
            } catch (error) {
                results.push({ id, status: 'rejected', reason: error.message });
            }
        }
        return results;
    }

}
