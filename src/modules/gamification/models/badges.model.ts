// src/graphql/models/badge.model.ts
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

export enum BadgeType {
    STREAK = 'streak',
    ACCURACY = 'accuracy',
    QUIZ_COUNT = 'quiz_count',
    SPEED = 'speed',
    SUBJECT_MASTER = 'subject_master',
}

registerEnumType(BadgeType, {
    name: 'BadgeType',
    description: 'Types of badges that can be earned',
});

@ObjectType()
export class UnlockCriteria {
    @Field(() => BadgeType)
    type: BadgeType;

    @Field(() => Int, { nullable: true })
    days?: number;

    @Field(() => Int, { nullable: true })
    percentage?: number;

    @Field(() => Int, { nullable: true })
    min_questions?: number;

    @Field(() => Int, { nullable: true })
    count?: number;

    @Field({ nullable: true })
    subject?: string;
}

@ObjectType()
export class Badge {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field({ nullable: true })
    description?: string;

    @Field({ nullable: true })
    iconUrl?: string;

    @Field({ nullable: true })
    badgeType?: string;

    @Field(() => GraphQLJSON)
    unlockCriteria: UnlockCriteria;

    @Field(() => Int)
    xpReward: number;

    @Field()
    createdAt: Date;
}
