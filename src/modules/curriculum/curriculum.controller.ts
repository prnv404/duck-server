import { Controller, Get, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { SubjectResponseDto, TopicResponseDto, SubjectAccuracyResponseDto } from './dto/curriculum.dto';
import { JwtRestAuthGuard } from '@/common/guards/jwt-rest.guard';
import type { AuthenticatedRequest } from '@/common/types/request.types';

@Controller('curriculum')
export class CurriculumController {
    constructor(private readonly curriculumService: CurriculumService) { }

    /**
     * Get all subjects
     * GET /api/v1/curriculum/subjects
     */
    @Get('subjects')
    @HttpCode(HttpStatus.OK)
    async getSubjects(): Promise<SubjectResponseDto[]> {
        const subjects = await this.curriculumService.getSubjects();
        return subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            iconUrl: subject.iconUrl,
            colorCode: subject.colorCode,
            displayOrder: subject.displayOrder,
            weightage: subject.weightage,
            is_active_in_random: subject.is_active_in_random ?? true,
            createdAt: subject.createdAt,
        }));
    }

    /**
     * Get subject by ID
     * GET /api/v1/curriculum/subjects/:id
     */
    @Get('subjects/:id')
    @HttpCode(HttpStatus.OK)
    async getSubjectById(@Param('id') id: string): Promise<SubjectResponseDto> {
        const subject = await this.curriculumService.getSubjectById(id);
        return {
            id: subject.id,
            name: subject.name,
            iconUrl: subject.iconUrl,
            colorCode: subject.colorCode,
            displayOrder: subject.displayOrder,
            weightage: subject.weightage,
            is_active_in_random: subject.is_active_in_random ?? true,
            createdAt: subject.createdAt,
        };
    }

    /**
     * Get topics by subject ID
     * GET /api/v1/curriculum/subjects/:id/topics
     */
    @Get('subjects/:id/topics')
    @HttpCode(HttpStatus.OK)
    async getTopicsBySubjectId(@Param('id') subjectId: string): Promise<TopicResponseDto[]> {
        const topics = await this.curriculumService.getTopicsBySubjectId(subjectId);
        return topics.map((topic) => ({
            id: topic.id,
            subjectId: topic.subjectId,
            name: topic.name,
            description: topic.description,
            displayOrder: topic.displayOrder,
            is_active_in_random: topic.is_active_in_random ?? true,
            weightage: topic.weightage,
            createdAt: topic.createdAt,
        }));
    }

    /**
     * Get topic by ID
     * GET /api/v1/curriculum/topics/:id
     */
    @Get('topics/:id')
    @HttpCode(HttpStatus.OK)
    async getTopicById(@Param('id') id: string): Promise<TopicResponseDto> {
        const topic = await this.curriculumService.getTopicById(id);
        return {
            id: topic.id,
            subjectId: topic.subjectId,
            name: topic.name,
            description: topic.description,
            displayOrder: topic.displayOrder,
            is_active_in_random: topic.is_active_in_random ?? true,
            weightage: topic.weightage,
            createdAt: topic.createdAt,
        };
    }

    /**
     * Get user's subject-wise accuracy
     * GET /api/v1/curriculum/my-accuracy
     * Requires authentication
     */
    @Get('my-accuracy')
    @UseGuards(JwtRestAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getMySubjectAccuracy(@Req() req: AuthenticatedRequest): Promise<SubjectAccuracyResponseDto[]> {
        const accuracy = await this.curriculumService.getSubjectWiseAccuracy(req.user.id);
        return accuracy.map((item) => ({
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            accuracy: item.accuracy,
            performance: item.performance,
        }));
    }
}
