import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { AnswerOption } from './answer.options.model';
import { TopicModel } from '@/modules/curriculum/model.ts/topic.model';

@ObjectType()
export class QuestionModel {
    @Field(() => ID)
    id: string;

    @Field(() => ID, { nullable: true })
    topicId?: string | null;

    @Field(() => String)
    questionText: string;

    @Field(() => String, { nullable: true })
    explanation?: string | null;

    @Field(() => Int)
    difficulty: number;

    @Field(() => Int)
    points: number;

    @Field(() => Int)
    timesAttempted: number;

    @Field(() => Int)
    timesCorrect: number;

    @Field(() => Boolean)
    isActive: boolean;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    // Relations (with DataLoaders)
    @Field(() => TopicModel, { nullable: true })
    topic?: TopicModel;

    @Field(() => [AnswerOption])
    answerOptions: AnswerOption[];
}
