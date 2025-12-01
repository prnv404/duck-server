import { Controller, Post, Body, Param, ParseUUIDPipe, Get, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QuestionGenerationService } from './question.gen.service';
import { GenerateQuestionDto, BatchApproveDto } from './question.dto';
import { QUESTION_GENERATION_QUEUE } from '@/queues/queue.module';
import { JobStatusResponse } from '@/queues/job.types';
import { topics } from '@/database/schema';
import { eq } from 'drizzle-orm';
import * as Database from '@/database';

@Controller('questions')
export class QuestionController {
    constructor(
        private readonly questionGenService: QuestionGenerationService,
        @InjectQueue(QUESTION_GENERATION_QUEUE) private questionQueue: Queue,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) {}

    @Post('generate')
    async generateQuestions(@Body() dto: GenerateQuestionDto) {
        const [topic] = await this.db.select().from(topics).where(eq(topics.id, dto.topicId));

        if (!topic) {
            throw new NotFoundException('Topic not found');
        }
        // Add job to queue instead of processing synchronously
        const job = await this.questionQueue.add(
            {
                prompt: dto.prompt + ' ' + topic.name,
                topicId: dto.topicId,
                model: dto.model,
                difficulty: dto.difficulty,
                count: dto.count || 5,
            },
            {
                priority: 2,
            },
        );

        return {
            jobId: job.id.toString(),
            status: 'queued',
            message: 'Question generation started. Use /questions/jobs/:jobId to check status',
        };
    }

    @Get('jobs/:jobId')
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
    async batchApproveQuestions(@Body() dto: BatchApproveDto) {
        return this.questionGenService.approveQuestions(dto.queueIds);
    }

    // @Post('approve/:id')
    // async approveQuestion(@Param('id', ParseUUIDPipe) id: string) {
    //     return this.questionGenService.approveQuestion(id);
    // }

    @Post('reject/:id')
    async rejectQuestion(@Param('id', ParseUUIDPipe) id: string) {
        return this.questionGenService.rejectQuestion(id);
    }

    @Get('pending')
    async getPendingQuestions() {
        const pendings = await this.questionGenService.getPendingQuestions();

        // send all ids as array
        return pendings.questions.map((question) => question.id);
    }
}
