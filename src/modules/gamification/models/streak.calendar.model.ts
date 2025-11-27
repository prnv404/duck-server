// src/graphql/models/streak-calendar.model.ts
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class StreakCalendar {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field()
    activityDate: Date;

    @Field(() => Int)
    quizzesCompleted: number;

    @Field(() => Int)
    questionsAnswered: number;

    @Field(() => Int)
    xpEarned: number;

    @Field()
    createdAt: Date;
}
