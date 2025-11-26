import { Injectable, Inject } from '@nestjs/common';
import { and, eq, notExists, gt, inArray, notInArray, sql, desc, asc, gte } from 'drizzle-orm';
import * as Database from '@/database';
import { questions, topics, subjects, userQuestionHistory, userTopicProgress, userQuizPreferences, type Question } from '@/database/schema';
import { BadRequestError } from '@/common/exceptions';

export enum QuestionPreferenceType {
    BALANCED = 'balanced',
    ADAPTIVE = 'adaptive',
    WEAK_AREA = 'weak_area',
    TOPIC_PRACTICE = 'topic_practice',
    DAILY_CHALLENGE = 'daily_challenge',
    SUBJECT_FOCUS = 'subject_focus',
}

interface GenerateQuestionsDto {
    userId: string;
    count: number;
    type: QuestionPreferenceType;
    topicId?: string;
    subjectIds?: string[];
}

@Injectable()
export class QuestionGenerationService {
    constructor(@Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB) {}

    async generateQuestions(dto: GenerateQuestionsDto): Promise<Question[]> {
        const { userId, count, type, topicId, subjectIds } = dto;

        if (type === QuestionPreferenceType.TOPIC_PRACTICE && !topicId) {
            throw new BadRequestError('topicId is required for TOPIC_PRACTICE');
        }

        const preferences = await this.getUserPreferences(userId);
        const baseConditions = this.getBaseExclusions(userId, preferences);

        switch (type) {
            case QuestionPreferenceType.BALANCED:
                return this.weightedBalancedStrategy(userId, count, preferences, baseConditions);

            case QuestionPreferenceType.WEAK_AREA:
                return this.weakAreaWeightedStrategy(userId, count, preferences, baseConditions);

            case QuestionPreferenceType.ADAPTIVE:
                return this.adaptiveWithWeightageStrategy(userId, count, preferences, baseConditions);

            case QuestionPreferenceType.TOPIC_PRACTICE:
                return this.topicPracticeStrategy(userId, topicId!, count, baseConditions);

            case QuestionPreferenceType.SUBJECT_FOCUS:
                return this.subjectFocusWeightedStrategy(
                    userId,
                    count,
                    subjectIds || preferences.preferredSubjectIds || [],
                    preferences,
                    baseConditions,
                );

            case QuestionPreferenceType.DAILY_CHALLENGE:
                return this.dailyChallengeWeightedStrategy(userId, count, preferences, baseConditions);

            default:
                return this.weightedBalancedStrategy(userId, count, preferences, baseConditions);
        }
    }

    private async getUserPreferences(userId: string) {
        const result = await this.db.select().from(userQuizPreferences).where(eq(userQuizPreferences.userId, userId)).limit(1);

        const prefs = result[0];

        // Define defaults first
        const defaults = {
            excludedSubjectIds: [] as string[],
            preferredSubjectIds: [] as string[],
            weakAreaThreshold: 70,
            minQuestionsForWeakDetection: 10,
            avoidRecentQuestionsDays: 7,
            difficultyAdaptationEnabled: true,
            preferredDifficulty: null as number | null,
            defaultBalanceStrategy: 'balanced' as const,
        };

        if (!prefs) {
            return defaults;
        }

        return {
            ...defaults,
            ...prefs,

            // Ensure these are always arrays and numbers (defensive)
            excludedSubjectIds: Array.isArray(prefs.excludedSubjectIds) ? prefs.excludedSubjectIds : defaults.excludedSubjectIds,

            preferredSubjectIds: Array.isArray(prefs.preferredSubjectIds) ? prefs.preferredSubjectIds : defaults.preferredSubjectIds,

            weakAreaThreshold: prefs.weakAreaThreshold ? Number(prefs.weakAreaThreshold) : defaults.weakAreaThreshold,

            minQuestionsForWeakDetection: prefs.minQuestionsForWeakDetection
                ? Number(prefs.minQuestionsForWeakDetection)
                : defaults.minQuestionsForWeakDetection,

            avoidRecentQuestionsDays: prefs.avoidRecentQuestionsDays ? Number(prefs.avoidRecentQuestionsDays) : defaults.avoidRecentQuestionsDays,

            difficultyAdaptationEnabled: prefs.difficultyAdaptationEnabled ?? true,
            preferredDifficulty: prefs.preferredDifficulty ?? null,
        };
    }

    private getBaseExclusions(userId: string, prefs: any) {
        const conditions = [
            eq(questions.isActive, true),

            // Never show questions user got correct before
            notExists(
                this.db
                    .select()
                    .from(userQuestionHistory)
                    .where(
                        and(
                            eq(userQuestionHistory.userId, userId),
                            eq(userQuestionHistory.questionId, questions.id),
                            gt(userQuestionHistory.timesCorrect, 0),
                        ),
                    ),
            ),
        ];

        // Optional: Avoid recently seen questions (even if wrong)
        if (prefs.avoidRecentQuestionsDays > 0) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - prefs.avoidRecentQuestionsDays);

            conditions.push(
                notExists(
                    this.db
                        .select()
                        .from(userQuestionHistory)
                        .where(
                            and(
                                eq(userQuestionHistory.userId, userId),
                                eq(userQuestionHistory.questionId, questions.id),
                                gte(userQuestionHistory.lastSeenAt, cutoff),
                                gt(userQuestionHistory.timesCorrect, 0),
                            ),
                        ),
                ),
            );
        }

        return conditions;
    }

    private async weightedBalancedStrategy(userId: string, count: number, prefs: any, baseConditions: any[]): Promise<Question[]> {
        const excluded = prefs.excludedSubjectIds.length > 0 ? prefs.excludedSubjectIds : ['00000000-0000-0000-0000-000000000000'];

        const weightedQuestions = await this.db
            .select({
                question: questions,
                weight: sql<number>`COALESCE(${topics.weightage}, 10) * COALESCE(${subjects.weightage}, 10)`,
            })
            .from(questions)
            .innerJoin(topics, eq(topics.id, questions.topicId))
            .innerJoin(subjects, eq(subjects.id, topics.subjectId))
            .where(
                and(
                    eq(topics.is_active_in_random, true),
                    eq(subjects.is_active_in_random, true),
                    notInArray(subjects.id, excluded),
                    ...baseConditions,
                ),
            )
            .orderBy(sql`RANDOM() ^ (1.0 / GREATEST(weight, 1))`) // Higher weight = more likely
            .limit(count * 5); // oversample

        // Final shuffle + limit
        return this.shuffleWeighted(
            weightedQuestions.map((q) => q.question),
            count,
        );
    }

    private async weakAreaWeightedStrategy(userId: string, count: number, prefs: any, baseConditions: any[]): Promise<Question[]> {
        const weakTopics = await this.db
            .select({
                topicId: userTopicProgress.topicId,
                accuracy: userTopicProgress.accuracy,
            })
            .from(userTopicProgress)
            .where(
                and(
                    eq(userTopicProgress.userId, userId),
                    gte(userTopicProgress.questionsAttempted, prefs.minQuestionsForWeakDetection),
                    sql`${userTopicProgress.accuracy}::float < ${prefs.weakAreaThreshold}`,
                ),
            )
            .orderBy(asc(userTopicProgress.accuracy))
            .limit(20);

        if (weakTopics.length === 0) {
            return this.weightedBalancedStrategy(userId, count, prefs, baseConditions);
        }

        const topicIds = weakTopics.map((t) => t.topicId);

        const questionsWithWeight = await this.db
            .select({
                question: questions,
                weight: sql<number>`COALESCE(${topics.weightage}, 10)`,
            })
            .from(questions)
            .innerJoin(topics, eq(topics.id, questions.topicId))
            .where(and(inArray(questions.topicId, topicIds), ...baseConditions));

        return this.shuffleWeighted(
            questionsWithWeight.map((q) => q.question),
            count,
        );
    }

    private async adaptiveWithWeightageStrategy(userId: string, count: number, prefs: any, baseConditions: any[]): Promise<Question[]> {
        const userStats = await this.db
            .select({ overallAccuracy: sql<number>`COALESCE(MAX(overall_accuracy), 60)` })
            .from(userTopicProgress)
            .where(eq(userTopicProgress.userId, userId));

        const accuracy = userStats[0]?.overallAccuracy || 60;
        const targetDiff = accuracy > 75 ? 4 : accuracy > 50 ? 3 : accuracy > 30 ? 2 : 1;

        const questionsWithWeight = await this.db
            .select({
                question: questions,
                weight: sql<number>`COALESCE(${topics.weightage}, 10) * (1 + ABS(${questions.difficulty} - ${targetDiff}))::float ^ -2`,
            })
            .from(questions)
            .innerJoin(topics, eq(topics.id, questions.topicId))
            .where(and(...baseConditions))
            .orderBy(sql`RANDOM() ^ (1.0 / GREATEST(weight, 0.1))`)
            .limit(count * 4);

        return this.shuffleWeighted(
            questionsWithWeight.map((q) => q.question),
            count,
        );
    }

    private async topicPracticeStrategy(userId: string, topicId: string, count: number, baseConditions: any[]): Promise<Question[]> {
        const result = await this.db
            .select({ question: questions })
            .from(questions)
            .where(and(eq(questions.topicId, topicId), ...baseConditions))
            .orderBy(sql`RANDOM()`)
            .limit(count * 3);

        return result.map((r) => r.question).slice(0, count);
    }

    private async subjectFocusWeightedStrategy(
        userId: string,
        count: number,
        subjectIds: string[],
        prefs: any,
        baseConditions: any[],
    ): Promise<Question[]> {
        if (subjectIds.length === 0) {
            return this.weightedBalancedStrategy(userId, count, prefs, baseConditions);
        }

        const questionsWithWeight = await this.db
            .select({
                question: questions,
                weight: sql<number>`COALESCE(${topics.weightage}, 10) * COALESCE(${subjects.weightage}, 10)`,
            })
            .from(questions)
            .innerJoin(topics, eq(topics.id, questions.topicId))
            .innerJoin(subjects, eq(subjects.id, topics.subjectId))
            .where(and(inArray(subjects.id, subjectIds), ...baseConditions));

        return this.shuffleWeighted(
            questionsWithWeight.map((q) => q.question),
            count,
        );
    }

    private async dailyChallengeWeightedStrategy(userId: string, count: number, prefs: any, baseConditions: any[]): Promise<Question[]> {
        const hard = await this.getHardQuestions(count * 0.4, baseConditions);
        const weak = await this.weakAreaWeightedStrategy(userId, count * 0.4, prefs, baseConditions);
        const fresh = await this.weightedBalancedStrategy(userId, count * 0.2, prefs, baseConditions);

        const mixed = [...hard, ...weak, ...fresh];
        return this.shuffleArray(mixed).slice(0, count);
    }

    private async getHardQuestions(limit: number, baseConditions: any[]): Promise<Question[]> {
        const result = await this.db
            .select({ question: questions })
            .from(questions)
            .where(and(gte(questions.difficulty, 4), ...baseConditions))
            .orderBy(sql`RANDOM()`)
            .limit(limit);

        return result.map((r) => r.question);
    }

    private shuffleWeighted<T>(items: T[], take: number): T[] {
        const result: T[] = [];
        const copy = [...items];

        while (result.length < take && copy.length > 0) {
            const idx = Math.floor(Math.random() ** 1.5 * copy.length);
            result.push(copy[idx]);
            copy.splice(idx, 1);
        }

        return result;
    }

    private shuffleArray<T>(array: T[]): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
