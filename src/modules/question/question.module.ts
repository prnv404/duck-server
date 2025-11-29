import { Module } from '@nestjs/common';
import { QuestionGenerationService } from './question.service';

@Module({
    providers: [QuestionGenerationService],
    exports: [QuestionGenerationService],
})
export class QuestionModule {}
