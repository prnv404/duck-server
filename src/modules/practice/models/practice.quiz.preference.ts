import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { User } from '@/modules/user/models/user.model';
import { registerEnumType } from '@nestjs/graphql';

export enum QuestionPreferenceType {
    BALANCED = 'balanced',
    ADAPTIVE = 'adaptive',
    WEAK_AREA = 'weak_area',
    TOPIC_PRACTICE = 'topic_practice',
    DAILY_CHALLENGE = 'daily_challenge',
    SUBJECT_FOCUS = 'subject_focus',
}

registerEnumType(QuestionPreferenceType, {
    name: 'QuestionPreferenceType',
    description: 'User question preference balance strategies',
});

@ObjectType()
export class UserPracticePreferenceModel{
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field()
    defaultBalanceStrategy: string;

    @Field(() => Int, { nullable: true })
    preferredDifficulty?: number;

    @Field()
    difficultyAdaptationEnabled: boolean;

    @Field(() => [ID!]!)
    excludedSubjectIds: string[];

    @Field(() => [ID!]!)
    preferredSubjectIds: string[];

    @Field(() => Int)
    avoidRecentQuestionsDays: number;

    @Field()
    allowQuestionRepetition: boolean;

    @Field(() => Int)
    defaultQuestionsPerSession: number;

    @Field(() => Int, { nullable: true })
    defaultTimeLimitSeconds?: number;

    @Field(() => Float)
    weakAreaThreshold: number;

    @Field(() => Int)
    minQuestionsForWeakDetection: number;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;

    // Relations
    @Field(() => User)
    user: User;
}
