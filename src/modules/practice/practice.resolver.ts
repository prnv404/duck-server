import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { QuizSessionService } from './practice.service';
import { CreateQuizSessionInput } from './practice.dto';
import { practiceSessions } from '@/database/schema';
import { QuestionWithAnswers } from '@/modules/question/question.service';
import { QuizSessionWithQuestions } from './models/practice.session.model';

@Resolver()
export class QuizResolver {
    constructor(private readonly quizService: QuizSessionService) {}

    @Mutation(() => QuizSessionWithQuestions)
    async createQuizSession(@Args('input') input: CreateQuizSessionInput): Promise<QuizSessionWithQuestions> {
        return await this.quizService.startQuiz(input);
    }
}
