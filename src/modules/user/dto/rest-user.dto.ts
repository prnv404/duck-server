import { IsOptional, IsString, IsBoolean, IsUrl, Length, Matches, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for updating user profile
 */
export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim().toLowerCase())
    @Length(3, 30)
    @Matches(/^[a-z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
    username?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    @Length(2, 100)
    fullName?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Avatar must be a valid URL' })
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    targetExam?: string;

    @IsOptional()
    @IsString()
    fcmToken?: string;

    @IsOptional()
    @IsBoolean()
    notificationEnabled?: boolean;
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
 */
export interface UserResponseDto {
    id: string;
    username: string;
    phone: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    targetExam?: string | null;
    fcmToken?: string | null;
    notificationEnabled: boolean;
    createdAt: Date;
    lastActiveAt?: Date | null;
}

/**
 * Response DTO for user statistics
 */
export interface UserStatsResponseDto {
    id: string;
    userId: string;
    totalXp: number;
    level: number;
    energy:number;
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

