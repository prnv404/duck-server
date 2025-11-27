// src/graphql/models/leaderboard-entry.model.ts
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
// import { User } from './user.model';

export enum PeriodType {
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    ALL_TIME = 'all_time',
}

registerEnumType(PeriodType, {
    name: 'PeriodType',
    description: 'Leaderboard period types',
});

@ObjectType()
export class LeaderboardEntry {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => PeriodType)
    periodType: PeriodType;

    @Field()
    periodStart: Date;

    @Field({ nullable: true })
    periodEnd?: Date;

    @Field(() => Int)
    xpEarned: number;

    @Field(() => Int)
    quizzesCompleted: number;

    @Field(() => Int, { nullable: true })
    rank?: number;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;

    //   // Relations
    //   @Field(() => User, { nullable: true })
    //   user?: User;
}
