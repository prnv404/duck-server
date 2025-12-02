import { SQL } from 'drizzle-orm';

/**
 * User quiz preferences with proper typing
 */
export interface UserQuizPreferences {
    userId: string;
    excludedSubjectIds: string[];
    preferredSubjectIds: string[];
    weakAreaThreshold: number;
    minQuestionsForWeakDetection: number;
    avoidRecentQuestionsDays: number;
    difficultyAdaptationEnabled: boolean;
    preferredDifficulty: number | null;
    defaultBalanceStrategy: 'balanced' | 'weak_area' | 'adaptive' | 'subject_focus' | 'hard_core';
}

/**
 * User quiz preferences data (without userId for internal use)
 */
export type UserQuizPreferencesData = Omit<UserQuizPreferences, 'userId'>;

/**
 * Base query conditions type for Drizzle ORM
 */
export type QueryCondition = SQL<unknown> | undefined;

/**
 * Array of query conditions
 */
export type QueryConditions = QueryCondition[];
