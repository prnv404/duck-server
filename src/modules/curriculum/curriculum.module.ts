import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumResolver } from './curriculum.resolver';

@Module({
    providers: [CurriculumService, CurriculumResolver],
})
export class TopicModule {}
