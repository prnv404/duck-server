/**
 * Response DTOs for Gamification Module
 */

export interface BadgeResponseDto {
    id: string;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    badgeType?: string | null;
    unlockCriteria: any;
    xpReward: number;
    createdAt: Date;
    unlockedAt?: Date | null;
    progressPercentage?: string;
}

export interface StreakCalendarEntryDto {
    id: string;
    userId: string;
    activityDate: Date;
    quizzesCompleted: number;
    questionsAnswered: number;
    xpEarned: number;
    createdAt: Date;
}

export interface StreakDataDto {
    currentStreak: number;
    longestStreak: number;
    calendar: StreakCalendarEntryDto[];
}

export interface LeaderboardEntryDto {
    userId: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    xpEarned: number;
    quizzesCompleted: number;
    rank?: number | null;
}
