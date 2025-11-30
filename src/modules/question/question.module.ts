import { Module } from '@nestjs/common';
import { QuestionController } from './question.controller';
import { QuestionGenerationService } from './question.gen.service';
import { QuestionGenerationService as QuestionService } from './question.service';
import { QueueModule } from '@/queues/queue.module';

@Module({
    imports: [QueueModule],
    controllers: [QuestionController],
    providers: [QuestionGenerationService, QuestionService],
    exports: [QuestionGenerationService, QuestionService],
})
export class QuestionModule { }
