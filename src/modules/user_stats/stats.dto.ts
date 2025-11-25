import { UserStats } from "@/database/schema";
import { Field, InputType,Int,Float } from "@nestjs/graphql";
import { IsDate, IsNotEmpty, IsNumber } from "class-validator";

@InputType({description: 'Input data for updating an existing user status'})
export class UpdateUserStatusInput implements Omit<Partial<UserStats>, 'userId' | 'createdAt' | 'updatedAt'> {

    @Field(() => Int, { description: 'Total XP' })
    @IsNumber()
    totalXp: number;

    @Field(() => Int, { description: 'Level' })
    @IsNumber()
    level: number;

    @Field(() => Int, { description: 'XP to next level' })
    @IsNumber()
    xpToNextLevel: number;

    @Field(() => Int, { description: 'Current streak' })
    @IsNumber()
    currentStreak: number;

    @Field(() => Int, { description: 'Longest streak' })
    @IsNumber()
    longestStreak: number;

    @Field(() => Date, { description: 'Last activity date' })
    @IsDate()
    lastActivityDate: Date;

    @Field(() => Int, { description: 'Total quizzes completed' })
    @IsNumber()
    totalQuizzesCompleted: number;

    @Field(() => Int, { description: 'Total questions attempted' })
    @IsNumber()
    totalQuestionsAttempted: number;

    @Field(() => Int, { description: 'Total correct answers' })
    @IsNumber()
    totalCorrectAnswers: number;

    @Field(() => Float, { description: 'Overall accuracy' })
    @IsNumber()
    overallAccuracy: string;

    @Field(() => Int, { description: 'Total practice time minutes' })
    @IsNumber()
    totalPracticeTimeMinutes: number;

}

     
