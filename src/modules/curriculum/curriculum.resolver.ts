import { Resolver } from '@nestjs/graphql';
import { CurriculumService } from './curriculum.service';
import { Args, Query } from '@nestjs/graphql';
import { SubjectModel, TopicModel } from './model.ts/topic.model';

@Resolver()
export class CurriculumResolver {
    constructor(private readonly curriculumService: CurriculumService) {}

    @Query(() => [SubjectModel], { name: 'subjects' })
    async subjects() {
        return this.curriculumService.getSubjects();
    }

    @Query(() => SubjectModel, { name: 'subjectById' })
    async subjectById(@Args('id') id: string) {
        return this.curriculumService.getSubjectById(id);
    }

    @Query(() => [TopicModel], { name: 'topicsBySubjectId' })
    async topicsBySubjectId(@Args('subjectId') subjectId: string) {
        return this.curriculumService.getTopicsBySubjectId(subjectId);
    }

    @Query(() => TopicModel, { name: 'topicById' })
    async topicById(@Args('id') id: string) {
        return this.curriculumService.getTopicById(id);
    }
}
