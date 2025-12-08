import { Controller, Post, Body, Param, ParseUUIDPipe, Get, Inject, NotFoundException, UseGuards, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QuestionGenerationService } from './question.gen.service';
import { QuestionStoreService } from './question-store.service';
import { GenerateQuestionDto, BatchApproveDto, ListQuestionsDto, GenerateAudioDto } from './question.dto';
import { QUESTION_GENERATION_QUEUE } from '@/queues/queue.module';
import { JobStatusResponse } from '@/queues/job.types';
import { topics, questions } from '@/database/schema';
import { eq, and, gte, lte, sql, SQL } from 'drizzle-orm';
import * as Database from '@/database';
import { DEFAULT_CONFIG } from './config/prompt.config';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('questions')
export class QuestionController {
    constructor(
        private readonly questionGenService: QuestionGenerationService,
        private readonly questionStoreService: QuestionStoreService,
        @InjectQueue(QUESTION_GENERATION_QUEUE) private questionQueue: Queue,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) {}

    @Post('generate')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async generateQuestions(@Body() dto: GenerateQuestionDto) {
        const [topic] = await this.db.select().from(topics).where(eq(topics.id, dto.topicId));

        if (!topic) {
            throw new NotFoundException('Topic not found');
        }

        // Resolve language with defaults
        const language = dto.language || DEFAULT_CONFIG.language;
        const count = dto.count || DEFAULT_CONFIG.count;

        // Calculate estimated processing time (approx 3 seconds per question + 2 seconds overhead)
        const estimatedProcessingTime = count * 1000 + 2;

        // Add job to queue instead of processing synchronously
        const job = await this.questionQueue.add(
            {
                prompt: dto.prompt + ' ' + topic.name,
                topicId: dto.topicId,
                model: dto.model,
                difficulty: dto.difficulty,
                count: count,
                language: language,
                useRAG: dto.useRAG, // Enable RAG for deduplication
            },
            {
                priority: 2,
            },
        );

        return {
            jobId: job.id.toString(),
            status: 'queued',
            message: 'Question generation started. Use /questions/jobs/:jobId to check status',
            estimatedProcessingTime: `${estimatedProcessingTime} seconds`,
            config: {
                questionCount: count,
                difficulty: dto.difficulty || DEFAULT_CONFIG.difficulty,
            },
        };
    }

    @Get('jobs')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async listAllJobs() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.questionQueue.getJobs(['waiting']),
            this.questionQueue.getJobs(['active']),
            this.questionQueue.getJobs(['completed']),
            this.questionQueue.getJobs(['failed']),
            this.questionQueue.getJobs(['delayed']),
        ]);

        const mapJob = (job: any) => ({
            jobId: job.id.toString(),
            data: job.data,
            progress: job.progress(),
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        });

        return {
            waiting: waiting.map(mapJob),
            active: active.map(mapJob),
            completed: completed.map(mapJob),
            failed: failed.map(mapJob),
            delayed: delayed.map(mapJob),
            counts: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
                total: waiting.length + active.length + completed.length + failed.length + delayed.length,
            },
        };
    }

    @Get('jobs/:jobId')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponse> {
        const job = await this.questionQueue.getJob(jobId);

        if (!job) {
            throw new Error('Job not found');
        }

        const state = await job.getState();
        const progress = job.progress();
        const result = job.returnvalue;

        return {
            jobId: job.id.toString(),
            status: state as JobStatusResponse['status'],
            progress: typeof progress === 'number' ? progress : undefined,
            result: result,
            error: job.failedReason,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        };
    }

    @Post('approve/batch')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async batchApproveQuestions(@Body() dto: BatchApproveDto) {
        return this.questionGenService.approveQuestions(dto.queueIds, dto.generateAudio!);
    }

    @Post('reject/:id')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async rejectQuestion(@Param('id', ParseUUIDPipe) id: string) {
        return this.questionGenService.rejectQuestion(id);
    }

    @Get('pending')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async getPendingQuestions() {
        const pendings = await this.questionGenService.getPendingQuestions();

        // send all ids as array
        return pendings;
    }

    @Post(':id/vote')
    async updateQuestionVote(
        @Param('id', ParseUUIDPipe) questionId: string,
        @Body() body: { voteType: 'upvote' | 'downvote'; reason?: string },
    ) {
        return this.questionGenService.updateQuestionVote(questionId, body.voteType, body.reason);
    }

    @Get('list')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async listQuestions(@Query() query: ListQuestionsDto) {
        const {
            subjectId,
            topicId,
            difficulty,
            minUpvotes,
            maxDownvotes,
            isActive,
            createdAfter,
            createdBefore,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            limit = 20,
            page = 1,
        } = query;

        const offset = (page - 1) * limit;

        // Build where conditions for relational query
        const data = await this.db.query.questions.findMany({
            with: {
                answerOptions: {
                    columns: {
                        id: true,
                        optionText: true,
                        isCorrect: true,
                        optionOrder: true,
                    },
                    orderBy: (opts, { asc }) => [asc(opts.optionOrder)],
                },
                topic: {
                    columns: { id: true, name: true, subjectId: true },
                    with: {
                        subject: {
                            columns: { id: true, name: true },
                        },
                    },
                },
            },
            where: (q, { eq, and, gte, lte }) => {
                const conditions: SQL[] = [];

                if (topicId) conditions.push(eq(q.topicId, topicId));
                if (difficulty) conditions.push(eq(q.difficulty, difficulty));
                if (minUpvotes !== undefined) conditions.push(gte(q.upvotes, minUpvotes));
                if (maxDownvotes !== undefined) conditions.push(lte(q.downvotes, maxDownvotes));
                if (isActive !== undefined) conditions.push(eq(q.isActive, isActive));
                if (createdAfter) conditions.push(gte(q.createdAt, new Date(createdAfter)));
                if (createdBefore) conditions.push(lte(q.createdAt, new Date(createdBefore)));

                return conditions.length > 0 ? and(...conditions) : undefined;
            },
            orderBy: (q, { asc, desc }) => {
                const orderFn = sortOrder === 'asc' ? asc : desc;
                const column = {
                    createdAt: q.createdAt,
                    upvotes: q.upvotes,
                    downvotes: q.downvotes,
                    difficulty: q.difficulty,
                    timesAttempted: q.timesAttempted,
                }[sortBy];
                return [orderFn(column)];
            },
            limit,
            offset,
        });

        // Filter by subjectId if provided (post-filter since it's on related table)
        const filteredData = subjectId ? data.filter((q) => q.topic?.subjectId === subjectId) : data;

        // Get total count
        const conditions: SQL[] = [];
        if (topicId) conditions.push(eq(questions.topicId, topicId));
        if (difficulty) conditions.push(eq(questions.difficulty, difficulty));
        if (minUpvotes !== undefined) conditions.push(gte(questions.upvotes, minUpvotes));
        if (maxDownvotes !== undefined) conditions.push(lte(questions.downvotes, maxDownvotes));
        if (isActive !== undefined) conditions.push(eq(questions.isActive, isActive));
        if (createdAfter) conditions.push(gte(questions.createdAt, new Date(createdAfter)));
        if (createdBefore) conditions.push(lte(questions.createdAt, new Date(createdBefore)));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const countResult = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(questions)
            .where(whereClause);

        const total = countResult[0]?.count ?? 0;

        return {
            data: filteredData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }

    // ==================== RAG STORE MANAGEMENT ====================

    @Get('store/status')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async getStoreStatus() {
        return {
            isReady: this.questionStoreService.isReady(),
            storeName: this.questionStoreService.getStoreName(),
        };
    }

    @Post('store/sync')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async syncQuestionsToStore() {
        const result = await this.questionStoreService.syncQuestionsToStore();
        return {
            success: result.success,
            syncedCount: result.syncedCount,
            message: `Synced ${result.syncedCount} questions to RAG store`,
        };
    }

    @Post('store/sync/:topicId')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async syncTopicQuestionsToStore(@Param('topicId', ParseUUIDPipe) topicId: string) {
        const result = await this.questionStoreService.syncTopicQuestions(topicId);
        return {
            success: result.success,
            syncedCount: result.syncedCount,
            message: `Synced ${result.syncedCount} questions for topic to RAG store`,
        };
    }

    // ==================== AUDIO SYNC ====================

    /**
     * Sync audio for questions - picks questions with null audioUrl and queues them
     * Similar to store/sync but for audio generation
     */
    @Post('audio/sync')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async syncAudioForQuestions(@Body() dto: GenerateAudioDto) {
        return this.questionGenService.syncAudioForQuestions({
            topicId: dto.topicId,
            limit: dto.limit || 50,
        });
    }

    /**
     * Sync audio for a specific topic
     */
    @Post('audio/sync/:topicId')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async syncAudioForTopic(@Param('topicId', ParseUUIDPipe) topicId: string, @Query('limit') limit?: string) {
        return this.questionGenService.syncAudioForQuestions({
            topicId,
            limit: limit ? parseInt(limit, 10) : 50,
        });
    }

    /**
     * Get count of questions missing audio
     */
    @Get('audio/missing')
    @AllowAnonymous()
    @UseGuards(ApiKeyGuard)
    async getQuestionsWithoutAudio(@Query('topicId') topicId?: string) {
        return this.questionGenService.getQuestionsWithoutAudioCount(topicId);
    }
}
