import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { User } from '@/modules/user/models/user.model';
import { TopicModel } from './topic.model';

@ObjectType()
export class UserTopicProgress {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ID)
    topicId: string;

    // Progress Stats
    @Field(() => Int)
    questionsAttempted: number;

    @Field(() => Int)
    correctAnswers: number;

    @Field(() => Float)
    accuracy: number;

    @Field({ nullable: true })
    lastPracticedAt?: Date;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;

    // Relations
    @Field(() => User)
    user: User;

    @Field(() => TopicModel)
    topic: TopicModel;
}
