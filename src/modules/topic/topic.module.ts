import { Module } from '@nestjs/common';
import { TopicService } from './topic.service';
import { TopicResolver } from './topic.resolver';

@Module({
    providers: [TopicService, TopicResolver],
})
export class TopicModule {}
