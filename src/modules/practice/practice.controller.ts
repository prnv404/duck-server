import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { QuizSessionService } from './practice.service';
import {
    CreateSessionDto,
    SubmitAnswerDto,
    PracticeSessionResponseDto,
    SessionAnswerResponseDto,
    QuestionResponseDto,
} from './dto/practice.dto';
import { JwtRestAuthGuard } from '@/common/guards/jwt-rest.guard';

@Controller('practice')
@UseGuards(JwtRestAuthGuard)
export class PracticeController {
    constructor(private readonly practiceService: QuizSessionService) { }

    /**
     * Create a new practice session
     * POST /api/v1/practice/sessions
     */
    @Post('sessions')
    @HttpCode(HttpStatus.CREATED)
    async createSession(@Req() req: any, @Body() dto: CreateSessionDto): Promise<PracticeSessionResponseDto> {
        const session = await this.practiceService.createPracticeSession({
            userId: req.user.id,
            ...dto,
        });

        const questions: QuestionResponseDto[] = session.questions.map((q) => ({
            id: q.id,
            topicId: q.topicId,
            questionText: q.questionText,
            explanation: q.explanation,
            difficulty: q.difficulty,
            isActive: q.isActive,
            createdAt: q.createdAt,
            answerOptions: (q as any).answerOptions?.map((opt: any) => ({
                id: opt.id,
                questionId: opt.questionId,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
                displayOrder: opt.displayOrder,
            })) || [],
        }));

        return {
            id: session.id,
            userId: session.userId,
            sessionType: session.sessionType,
            topicId: session.topicId,
            totalQuestions: session.totalQuestions,
            questionsAttempted: session.questionsAttempted,
            correctAnswers: session.correctAnswers,
            wrongAnswers: session.wrongAnswers,
            accuracy: session.accuracy,
            xpEarned: session.xpEarned || 0,
            status: session.status,
            timeSpentSeconds: session.timeSpentSeconds || 0,
            createdAt: session.createdAt,
            completedAt: session.completedAt,
            questions,
        };
    }

    /**
     * Get active practice session
     * GET /api/v1/practice/sessions/active
     */
    @Get('sessions/active')
    @HttpCode(HttpStatus.OK)
    async getActiveSession(@Req() req: any): Promise<PracticeSessionResponseDto | null> {
        const session = await this.practiceService.getActiveSession(req.user.id);
        if (!session) return null;

        return {
            id: session.id,
            userId: session.userId,
            sessionType: session.sessionType,
            topicId: session.topicId,
            totalQuestions: session.totalQuestions,
            questionsAttempted: session.questionsAttempted,
            correctAnswers: session.correctAnswers,
            wrongAnswers: session.wrongAnswers,
            accuracy: session.accuracy,
            xpEarned: session.xpEarned || 0,
            status: session.status,
            timeSpentSeconds: session.timeSpentSeconds || 0,
            createdAt: session.createdAt,
            completedAt: session.completedAt,
        };
    }

    /**
     * Get a specific practice session
     * GET /api/v1/practice/sessions/:id
     */
    @Get('sessions/:id')
    @HttpCode(HttpStatus.OK)
    async getSession(@Param('id') sessionId: string): Promise<PracticeSessionResponseDto> {
        const session = await this.practiceService.getPracticeSession(sessionId);

        return {
            id: session.id,
            userId: session.userId,
            sessionType: session.sessionType,
            topicId: session.topicId,
            totalQuestions: session.totalQuestions,
            questionsAttempted: session.questionsAttempted,
            correctAnswers: session.correctAnswers,
            wrongAnswers: session.wrongAnswers,
            accuracy: session.accuracy,
            xpEarned: session.xpEarned || 0,
            status: session.status,
            timeSpentSeconds: session.timeSpentSeconds || 0,
            createdAt: session.createdAt,
            completedAt: session.completedAt,
        };
    }

    /**
     * Submit an answer to a question in a session
     * POST /api/v1/practice/sessions/:id/answers
     */
    @Post('sessions/:id/answers')
    @HttpCode(HttpStatus.CREATED)
    async submitAnswer(
        @Param('id') sessionId: string,
        @Body() dto: SubmitAnswerDto,
    ): Promise<SessionAnswerResponseDto> {
        const answer = await this.practiceService.submitAnswer({
            sessionId,
            questionId: dto.questionId,
            selectedOptionId: dto.selectedOptionId || null,
            timeSpentSeconds: dto.timeSpentSeconds,
        });

        return {
            id: answer.id,
            sessionId: answer.sessionId,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId || null,
            isCorrect: answer.isCorrect,
            timeSpentSeconds: answer.timeSpentSeconds || 0,
            answeredAt: answer.answeredAt,
        };
    }

    /**
     * Complete a practice session
     * POST /api/v1/practice/sessions/:id/complete
     */
    @Post('sessions/:id/complete')
    @HttpCode(HttpStatus.OK)
    async completeSession(@Param('id') sessionId: string): Promise<PracticeSessionResponseDto> {
        const session = await this.practiceService.completeSession(sessionId);

        return {
            id: session.id,
            userId: session.userId,
            sessionType: session.sessionType,
            topicId: session.topicId,
            totalQuestions: session.totalQuestions,
            questionsAttempted: session.questionsAttempted,
            correctAnswers: session.correctAnswers,
            wrongAnswers: session.wrongAnswers,
            accuracy: session.accuracy,
            xpEarned: session.xpEarned || 0,
            status: session.status,
            timeSpentSeconds: session.timeSpentSeconds || 0,
            createdAt: session.createdAt,
            completedAt: session.completedAt,
        };
    }
}
