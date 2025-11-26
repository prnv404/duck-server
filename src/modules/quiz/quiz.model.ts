import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { QuestionModel } from '../question/question.model';

@ObjectType()
export class QuizSessionModel {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => String)
    sessionType: string;

    @Field(() => ID, { nullable: true })
    topicId: string | null;

    @Field(() => Int)
    totalQuestions: number;

    @Field(() => Int)
    questionsAttempted: number;

    @Field(() => Int)
    correctAnswers: number;

    @Field(() => Int)
    wrongAnswers: number;

    @Field(() => Float)
    accuracy: number;

    @Field(() => Int)
    xpEarned: number;

    @Field(() => Date)
    startedAt: Date;

    @Field(() => Date, { nullable: true })
    completedAt: Date | null;

    @Field(() => Int, { nullable: true })
    timeSpentSeconds: number | null;

    @Field(() => String)
    balanceStrategy: string;

    @Field(() => String)
    subjectDistribution: any;

    @Field(() => String)
    topicDistribution: any;

    @Field(() => String)
    status: string;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => [SessionAnswerModel], { nullable: true })
    sessionAnswers?: SessionAnswerModel[];

    @Field(() => [QuestionModel], { nullable: true })
    questions?: QuestionModel[];
}

@ObjectType()
export class SessionAnswerModel {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    sessionId: string;

    @Field(() => ID)
    questionId: string;

    @Field(() => ID, { nullable: true })
    selectedOptionId: string | null;

    @Field(() => Boolean)
    isCorrect: boolean;

    @Field(() => Int, { nullable: true })
    timeSpentSeconds: number | null;

    @Field(() => Date)
    answeredAt: Date;
}
