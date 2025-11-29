import { Args, Mutation, Resolver,Query } from '@nestjs/graphql';
import { QuizSessionService } from './practice.service';
import { CreateSessionInput } from './practice.dto';
import { SessionAnswer } from '@/database/schema';
import { PracticeSessionWithQuestions,PracticeSession } from './models/practice.session.model';
import { SubmitAnswerInput } from './practice.dto';
import { SessionAnswerModel } from './models/practice.answer.model';

@Resolver()
export class QuizResolver {
    constructor(private readonly quizService: QuizSessionService) {}

     @Query(() =>PracticeSession)
    async getPracticeSession(@Args('sessionId') sessionId: string): Promise<PracticeSession> {
        return await this.quizService.getPracticeSession(sessionId);
    }

    @Mutation(() => PracticeSessionWithQuestions)
    async createPracticeSession(@Args('input') input: CreateSessionInput): Promise<PracticeSessionWithQuestions> {
        return await this.quizService.createPracticeSession(input);
    }

    @Mutation(() => SessionAnswerModel)
    async submitAnswer(@Args('input') input: SubmitAnswerInput): Promise<SessionAnswer> {
        return await this.quizService.submitAnswer(input);
    }

    @Mutation(() => PracticeSession)
    async completeSession(@Args('sessionId') sessionId: string): Promise<PracticeSession> {
        return await this.quizService.completeSession(sessionId);
    }
}
