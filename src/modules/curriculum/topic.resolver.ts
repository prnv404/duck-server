import { Resolver } from '@nestjs/graphql';
import { TopicService } from './topic.service';
import { Args, Query } from '@nestjs/graphql';
import { SubjectModel, TopicModel } from './model.ts/topic.model';

@Resolver()
export class TopicResolver {
    constructor(private readonly topicService: TopicService) {}

    @Query(() => [SubjectModel], { name: 'subjects' })
    async subjects() {
        return this.topicService.getSubjects();
    }

    @Query(() => SubjectModel, { name: 'subjectById' })
    async subjectById(@Args('id') id: string) {
        return this.topicService.getSubjectById(id);
    }

    @Query(() => [TopicModel], { name: 'topicsBySubjectId' })
    async topicsBySubjectId(@Args('subjectId') subjectId: string) {
        return this.topicService.getTopicsBySubjectId(subjectId);
    }

    @Query(() => TopicModel, { name: 'topicById' })
    async topicById(@Args('id') id: string) {
        return this.topicService.getTopicById(id);
    }
}
