import { ObjectType, Field, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';
import { User, UserStats } from '@/database/schema';

@ObjectType()
export class UserModel implements User {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    username: string;

    @Field(() => String)
    phone: string;

    @Field(() => String, { nullable: true })
    fullName: string | null;

    @Field(() => String, { nullable: true })
    avatarUrl: string | null;

    @Field(() => String, { nullable: true })
    targetExam: string | null;

    @Field(() => Boolean, { defaultValue: true })
    notificationEnabled: boolean;

    @Field(() => String, { nullable: true })
    otp?: string | null;

    @Field(() => String, { nullable: true })
    fcmToken: string | null;

    @Field(() => String, { nullable: true })
    refreshToken: string | null;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    @Field(() => GraphQLISODateTime, { nullable: true })
    lastActiveAt: Date | null;

    @Field(() => UserStatsModel, { nullable: true })
    userStats?: UserStatsModel | null;
}

@ObjectType()
export class UserStatsModel implements UserStats {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => Int)
    totalXp: number;

    @Field(() => Int)
    level: number;

    @Field(() => Int)
    xpToNextLevel: number;

    @Field(() => Int)
    currentStreak: number;

    @Field(() => Int)
    longestStreak: number;

    @Field(() => GraphQLISODateTime, { nullable: true })
    lastActivityDate: Date | null;

    @Field(() => Int)
    totalQuizzesCompleted: number;

    @Field(() => Int)
    totalQuestionsAttempted: number;

    @Field(() => Int)
    totalCorrectAnswers: number;

    @Field(() => String)
    overallAccuracy: string;

    @Field(() => Int)
    totalPracticeTimeMinutes: number;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    @Field(() => GraphQLISODateTime)
    updatedAt: Date;

    @Field(() => UserModel)
    user?: UserModel;
}
