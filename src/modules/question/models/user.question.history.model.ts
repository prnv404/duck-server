import { ObjectType, Field, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';
import { User } from '@/modules/user/models/user.model';
import { QuestionModel } from './question.model';

@ObjectType()
export class UserQuestionHistory {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ID)
    questionId: string;

    @Field(() => GraphQLISODateTime)
    lastSeenAt: Date;

    @Field(() => Int)
    timesSeen: number;

    @Field(() => Int)
    timesCorrect: number;

    // Relations
    @Field(() => User)
    user: User;

    @Field(() => QuestionModel)
    question: QuestionModel;
}
