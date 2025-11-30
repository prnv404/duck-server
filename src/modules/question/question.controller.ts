import { Controller, Post, Body, Param, ParseUUIDPipe, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QuestionGenerationService } from './question.gen.service';
import { GenerateQuestionDto } from './question.dto';
import { QUESTION_GENERATION_QUEUE } from '@/queues/queue.module';
import { JobStatusResponse } from '@/queues/job.types';

@Controller('questions')
export class QuestionController {
    constructor(
        private readonly questionGenService: QuestionGenerationService,
        @InjectQueue(QUESTION_GENERATION_QUEUE) private questionQueue: Queue,
    ) { }

    @Post('generate')
    async generateQuestions(@Body() dto: GenerateQuestionDto) {
        // Add job to queue instead of processing synchronously
        const job = await this.questionQueue.add(
            {
                prompt: dto.prompt,
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

    @Post('approve/:id')
    async approveQuestion(@Param('id', ParseUUIDPipe) id: string) {
        return this.questionGenService.approveQuestion(id);
    }
}
