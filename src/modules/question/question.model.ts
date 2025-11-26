import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { AnswerOption, Question } from '@/database/schema';

@ObjectType()
export class QuestionModel implements Question {
    @Field(() => ID)
    id: string;

    @Field(() => ID, { nullable: true })
    topicId: string | null;

    @Field(() => String)
    questionText: string;

    @Field(() => String, { nullable: true })
    explanation: string | null;

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

    @Field(() => [AnswerOptionsModel], { nullable: true })
    answerOptions?: AnswerOptionsModel[];
}

export class AnswerOptionsModel implements AnswerOption {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    questionId: string;

    @Field(() => String)
    optionText: string;

    @Field(() => Boolean)
    isCorrect: boolean;

    @Field(() => Int)
    optionOrder: number;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;
}
