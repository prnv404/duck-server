import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// ============================================
// UserStats GraphQL Type
// ============================================
@ObjectType()
export class UserStats {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    // XP & Levels
    @Field(() => Int)
    totalXp: number;

    @Field(() => Int)
    level: number;

    @Field(() => Int)
    xpToNextLevel: number;

    @Field(() => Int)
    energy: number;

    // Streaks
    @Field(() => Int)
    currentStreak: number;

    @Field(() => Int)
    longestStreak: number;

    @Field({ nullable: true })
    lastActivityDate?: Date;

    // Quiz Stats
    @Field(() => Int)
    totalQuizzesCompleted: number;

    @Field(() => Int)
    totalQuestionsAttempted: number;

    @Field(() => Int)
    totalCorrectAnswers: number;

    @Field()
    overallAccuracy: string;

    // Time tracking
    @Field(() => Int)
    totalPracticeTimeMinutes: number;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}
