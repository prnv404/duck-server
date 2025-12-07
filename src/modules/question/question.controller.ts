import { Controller, Post, Body, Param, ParseUUIDPipe, Get, Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QuestionGenerationService } from './question.gen.service';
import { GenerateQuestionDto, BatchApproveDto } from './question.dto';
import { QUESTION_GENERATION_QUEUE } from '@/queues/queue.module';
import { JobStatusResponse } from '@/queues/job.types';
import { topics } from '@/database/schema';
import { eq } from 'drizzle-orm';
import * as Database from '@/database';
import { getLanguageConfig, DEFAULT_CONFIG } from './config/prompt.config';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('questions')
export class QuestionController {
    constructor(
        private readonly questionGenService: QuestionGenerationService,
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

        // Get config summaries
        const languageConfig = getLanguageConfig(language);

        // Calculate estimated processing time (approx 3 seconds per question + 2 seconds overhead)
        const estimatedProcessingTime = count * 3 + 2;

        // Add job to queue instead of processing synchronously
        const job =  await this.questionQueue.add(
            {
                prompt: dto.prompt + ' ' + topic.name,
                topicId: dto.topicId,
                model: dto.model,
                difficulty: dto.difficulty,
                count: count,
                language: language,
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
        return this.questionGenService.approveQuestions(dto.queueIds) as any;
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
        return pendings
    }

    @Post(':id/vote')
    async updateQuestionVote(
        @Param('id', ParseUUIDPipe) questionId: string,
        @Body() body: { voteType: 'upvote' | 'downvote'; reason?: string },
    ) {
        return this.questionGenService.updateQuestionVote(questionId, body.voteType, body.reason);
    }
}
