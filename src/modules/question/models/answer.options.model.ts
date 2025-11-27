import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { QuestionModel } from './question.model';

@ObjectType()
export class AnswerOption {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    questionId: string;

    @Field(() => String)
    optionText: string;

    @Field(() => Boolean)
    isCorrect: boolean;

    @Field(() => Int, { nullable: true })
    optionOrder?: number | null;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    // Relations
    @Field(() => QuestionModel, { nullable: true })
    question?: QuestionModel;
}
