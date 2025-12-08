import { Module } from '@nestjs/common';
import { QuestionStoreService } from './question-store.service';
import { IntegrationModule } from '@/integrations/integration.module';
import { DatabaseModule } from '@/database/db.module';

@Module({
    imports: [IntegrationModule, DatabaseModule],
    providers: [QuestionStoreService],
    exports: [QuestionStoreService],
})
export class QuestionStoreModule {}
