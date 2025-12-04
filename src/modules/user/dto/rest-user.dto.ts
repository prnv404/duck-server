import { IsOptional, IsString, IsUrl, Length, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for updating user profile
 * Only includes fields that Better Auth allows to be updated
 */
export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(1, 100)
    name?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Image must be a valid URL' })
    image?: string;
}

/**
 * DTO for updating user statistics
 */
export class UpdateUserStatsDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    totalXp?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    level?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    xpToNextLevel?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    currentStreak?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    longestStreak?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    totalQuizzesCompleted?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    totalQuestionsAttempted?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    totalCorrectAnswers?: number;

    @IsOptional()
    @IsString()
    overallAccuracy?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    totalPracticeTimeMinutes?: number;
}

/**
 * Response DTO for user profile
 * Matches Better Auth user model
 */
export interface UserResponseDto {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Response DTO for user statistics
 */
export interface UserStatsResponseDto {
    id: string;
    userId: string;
    totalXp: number;
    level: number;
    energy: number;
    xpToNextLevel: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate?: Date | null;
    totalQuizzesCompleted: number;
    totalQuestionsAttempted: number;
    totalCorrectAnswers: number;
    overallAccuracy: string;
    totalPracticeTimeMinutes: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Response DTO for streak calendar
 */
export interface StreakCalendarResponseDto {
    id: string;
    userId: string;
    date: Date;
    quizzesCompleted: number;
    questionsAnswered: number;
    xpEarned: number;
    streakDay: number;
}
