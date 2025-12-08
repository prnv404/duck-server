import { Module } from '@nestjs/common';
import { QuestionController } from './question.controller';
import { QuestionGenerationService } from './question.gen.service';
import { QuestionService } from './question.service';
import { QuestionStoreModule } from './question-store.module';
import { QueueModule } from '@/queues/queue.module';

@Module({
    imports: [QueueModule, QuestionStoreModule],
    controllers: [QuestionController],
    providers: [QuestionGenerationService, QuestionService],
    exports: [QuestionGenerationService, QuestionService],
})
export class QuestionModule {}
