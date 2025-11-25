import { ObjectType, Field, ID, Int, GraphQLISODateTime } from "@nestjs/graphql";
import { UserStats } from "@/database/schema";

@ObjectType({ 
    description: 'User status model',
})
export class UserStatusModel implements Omit<UserStats, 'userId'> {
    
    @Field(() => ID, { description: 'The unique UUID of the user stats entry.' })
    id: string;

    @Field(() => ID, { description: 'The unique UUID of the user.' })
    userId: string;
    
    @Field(() => Int, { description: 'Total XP gained by the user.' })
    totalXp: number;
    
    @Field(() => Int, { description: 'Current level of the user.' })
    level: number;
    
    @Field(() => Int, { description: 'XP required to reach the next level.' })
    xpToNextLevel: number;
    
    @Field(() => Int, { description: 'Current streak (consecutive days of activity).' })
    currentStreak: number;
    
    @Field(() => Int, { description: 'Longest streak achieved by the user.' })
    longestStreak: number;
    
    @Field(() => GraphQLISODateTime, { 
        nullable: true, 
        description: 'Last activity date of the user.' 
    })
    lastActivityDate: Date|null; // ✅ NULLABLE in DB, so nullable: true and optional (?)
    
    @Field(() => Int, { description: 'Total number of quizzes completed.' })
    totalQuizzesCompleted: number;
    
    @Field(() => Int, { description: 'Total number of questions attempted.' })
    totalQuestionsAttempted: number;
    
    @Field(() => Int, { description: 'Total number of correct answers.' })
    totalCorrectAnswers: number;
    
    @Field(() => String, { description: 'Overall accuracy as a percentage (e.g., "89.50").' })
    overallAccuracy: string; // ✅ Decimal from DB stored as string
    
    @Field(() => Int, { description: 'Total practice time in minutes.' })
    totalPracticeTimeMinutes: number;
    
    @Field(() => GraphQLISODateTime, { description: 'Timestamp when the record was created.' })
    createdAt: Date;
    
    @Field(() => GraphQLISODateTime, { description: 'Timestamp when the record was last updated.' })
    updatedAt: Date;
}
