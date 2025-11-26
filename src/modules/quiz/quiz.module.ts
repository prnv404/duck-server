import { Module } from '@nestjs/common';
import { QuizSessionService } from './quiz.service';
import { QuizResolver } from './quiz.resolver';
import { DatabaseModule } from '@/database';
import { QuestionModule } from '@/modules/question/question.module';

@Module({
    imports: [DatabaseModule, QuestionModule],
    providers: [QuizSessionService, QuizResolver],
})
export class QuizModule {}
