import { Module } from '@nestjs/common';
import { QuizSessionService } from './practice.service';
import { PracticeController } from './practice.controller';
import { DatabaseModule } from '@/database';
import { QuestionModule } from '@/modules/question/question.module';

@Module({
    imports: [DatabaseModule, QuestionModule],
    controllers: [PracticeController],
    providers: [QuizSessionService],
})
export class PracticeModule { }
