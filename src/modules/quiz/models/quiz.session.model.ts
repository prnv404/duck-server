import { ObjectType, Field, ID, Float, Int, GraphQLISODateTime } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { SessionAnswer } from './session.answer.model';
import { TopicModel } from '@/modules/curriculum/model.ts/topic.model';
import { User } from '@/modules/user/models/user.model';
import { QuestionWithAnswers } from '@/modules/question/question.service';
import { AnswerOption } from '@/database/schema';
import { QuestionModel } from '@/modules/question/models/question.model';

// ============================================
// SessionStatus Enum
// ============================================
export enum SessionStatus {
    DRAFT = 'draft',
    IN_PROGRESS = 'in_progress',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    ABANDONED = 'abandoned',
}

registerEnumType(SessionStatus, {
    name: 'SessionStatus',
    description: 'Quiz session status',
});

// ============================================
// QuizSession GraphQL Type
// ============================================
@ObjectType()
export class QuizSession {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => String)
    sessionType: string;

    @Field(() => ID, { nullable: true })
    topicId?: string | null;

    @Field(() => Int)
    totalQuestions: number;

    @Field(() => Int)
    questionsAttempted: number;

    @Field(() => Int)
    correctAnswers: number;

    @Field(() => Int)
    wrongAnswers: number;

    @Field(() => String)
    accuracy: string;

    @Field(() => Int)
    xpEarned: number;

    @Field(() => GraphQLISODateTime)
    startedAt: Date;

    @Field(() => GraphQLISODateTime, { nullable: true })
    completedAt?: Date | null;

    @Field(() => Int, { nullable: true })
    timeSpentSeconds?: number | null;

    @Field()
    balanceStrategy: string;

    @Field(() => GraphQLJSON)
    subjectDistribution: any;

    @Field(() => GraphQLJSON)
    topicDistribution: any;

    @Field(() => SessionStatus)
    status: SessionStatus | string;

    @Field()
    createdAt: Date;

    // Relations
    @Field(() => User)
    user?: User;

    @Field(() => TopicModel, { nullable: true })
    topic?: TopicModel;

    @Field(() => [SessionAnswer!]!)
    sessionAnswers?: SessionAnswer[];
}

@ObjectType()
export class QuizSessionWithQuestions extends QuizSession {
    @Field(() => [QuestionModel])
    questions: QuestionModel[];
}
