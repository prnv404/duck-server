import { Module } from '@nestjs/common';
import { QuizSessionService } from './practice.service';
import { PracticeController } from './practice.controller';
import { DatabaseModule } from '@/database';
import { QuestionModule } from '@/modules/question/question.module';
import { GamificationModule } from '@/modules/gamification/gamification.module';

@Module({
    imports: [DatabaseModule, QuestionModule,GamificationModule],
    controllers: [PracticeController],
    providers: [QuizSessionService],
})
export class PracticeModule { }
