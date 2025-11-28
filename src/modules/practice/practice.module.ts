import { Module } from '@nestjs/common';
import { QuizSessionService } from './practice.service';
import { QuizResolver } from './practice.resolver';
import { DatabaseModule } from '@/database';
import { QuestionModule } from '@/modules/question/question.module';

@Module({
    imports: [DatabaseModule, QuestionModule],
    providers: [QuizSessionService, QuizResolver],
})
export class QuizModule { }
