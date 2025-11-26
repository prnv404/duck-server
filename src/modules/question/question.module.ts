import { Module } from '@nestjs/common';
import { QuestionGenerationService } from './question.service';
import { QuestionResolver } from './question.resolver';

@Module({
    providers: [QuestionGenerationService, QuestionResolver],
    exports: [QuestionGenerationService],
})
export class QuestionModule {}
