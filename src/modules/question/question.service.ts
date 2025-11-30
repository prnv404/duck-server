import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, notExists, gt, inArray, notInArray, sql, desc, asc, gte } from 'drizzle-orm';
import * as Database from '@/database';
import {
    questions,
    topics,
    subjects,
    userQuestionHistory,
    userTopicProgress,
    userQuizPreferences,
    answerOptions,
    type Question,
    type AnswerOption,
    QuestionPreferenceType,
} from '@/database/schema';
import { CreateSessionInput } from '../practice/practice.dto';

export interface QuestionWithAnswers extends Question {
    answerOptions: AnswerOption[];
}

export interface QuestionWithMetadata extends Question {
    topicWeight: number | null;
    subjectWeight: number | null;
}

export interface UserTopicProgressWithId {
    topicId: string;
    accuracy: string;
    questionsAttempted: number;
}

@Injectable()
export class QuestionGenerationService {
    constructor(@Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB) {}

    async generateQuestions(dto: CreateSessionInput & { count: number }): Promise<QuestionWithAnswers[]> {
        const { userId, count = 15, type, subjectIds } = dto;
        const preferences = await this.getUserPreferences(userId);
        const baseConditions = this.getBaseExclusions(userId, preferences);

        let questions: Question[];
        switch (type) {
            case QuestionPreferenceType.BALANCED:
                questions = await this.weightedBalancedStrategy(userId, count, preferences, baseConditions);
                break;
            case QuestionPreferenceType.WEAK_AREA:
                questions = await this.weakAreaWeightedStrategy(userId, count, preferences, baseConditions);
                break;
            case QuestionPreferenceType.ADAPTIVE:
                questions = await this.adaptiveWithWeightageStrategy(userId, count, preferences, baseConditions);
                break;
            case QuestionPreferenceType.SUBJECT_FOCUS:
                questions = await this.subjectFocusWeightedStrategy(
                    userId,
                    count,
                    subjectIds || preferences.preferredSubjectIds || [],
                    preferences,
                    baseConditions,
                );
                break;
            case QuestionPreferenceType.HARD_CORE:
                questions = await this.hardCoreWeightedStrategy(userId, count, preferences, baseConditions);
                break;
            default:
                questions = await this.weightedBalancedStrategy(userId, count, preferences, baseConditions);
        }

        if (questions.length < 0) {
            throw new NotFoundException(
                `Not enough questions available for this mode: ${type || 'default'}. Found only ${questions.length} out of ${count} required.`,
            );
        }

        // Fetch answer options for the selected questions
        const questionIds = questions.map((q) => q.id);
        if (questionIds.length === 0) {
            return [];
        }

        const allOptions = await this.db.select().from(answerOptions).where(inArray(answerOptions.questionId, questionIds));

        const optionsByQuestionId = allOptions.reduce(
            (acc, option) => {
                if (!acc[option.questionId]) {
                    acc[option.questionId] = [];
                }
                acc[option.questionId]!.push(option);
                return acc;
            },
            {} as Record<string, AnswerOption[]>,
        );

        return questions.map((q) => ({
            ...q,
            answerOptions: optionsByQuestionId[q.id] || [],
        }));
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
            preferredSubjectIds: Array.isArray(prefs.preferredSubjectIds)
                ? prefs.preferredSubjectIds
                : defaults.preferredSubjectIds,
            weakAreaThreshold: prefs.weakAreaThreshold ? Number(prefs.weakAreaThreshold) : defaults.weakAreaThreshold,
            minQuestionsForWeakDetection: prefs.minQuestionsForWeakDetection
                ? Number(prefs.minQuestionsForWeakDetection)
                : defaults.minQuestionsForWeakDetection,
            avoidRecentQuestionsDays: prefs.avoidRecentQuestionsDays
                ? Number(prefs.avoidRecentQuestionsDays)
                : defaults.avoidRecentQuestionsDays,
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
        // Optional: Avoid recently seen questions that were correct (allow recent incorrect for retry)
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

    private async fetchCandidateQuestionsWithMetadata(
        userId: string,
        baseConditions: any[],
        excludedSubjectIds: string[],
        options?: {
            topicIds?: string[];
            subjectIds?: string[];
            minDifficulty?: number;
            limit?: number;
        },
    ): Promise<QuestionWithMetadata[]> {
        const { topicIds, subjectIds, minDifficulty, limit = 100 } = options || {};
        const whereClauses: any[] = [
            ...baseConditions,
            eq(topics.is_active_in_random, true),
            eq(subjects.is_active_in_random, true),
            notInArray(subjects.id, excludedSubjectIds),
        ];
        if (topicIds?.length) {
            whereClauses.push(inArray(questions.topicId, topicIds));
        }
        if (subjectIds?.length) {
            whereClauses.push(inArray(subjects.id, subjectIds));
        }
        if (minDifficulty) {
            whereClauses.push(gte(questions.difficulty, minDifficulty));
        }
        const where = and(...whereClauses);

        const candidates = await this.db
            .select({
                question: questions,
                topicWeight: topics.weightage,
                subjectWeight: subjects.weightage,
            })
            .from(questions)
            .innerJoin(topics, eq(topics.id, questions.topicId))
            .innerJoin(subjects, eq(subjects.id, topics.subjectId))
            .where(where)
            .orderBy(sql`RANDOM()`)
            .limit(limit);

        return candidates.map((c) => ({
            ...c.question,
            topicWeight: c.topicWeight,
            subjectWeight: c.subjectWeight,
        }));
    }

    private computeWeight(q: QuestionWithMetadata): number {
        return (q.topicWeight ?? 10) * (q.subjectWeight ?? 10);
    }

    private weightedSample<T extends QuestionWithMetadata>(items: T[], k: number, getWeight: (item: T) => number): T[] {
        if (k >= items.length) {
            return [...items];
        }

        const result: T[] = [];
        let remainingItems = [...items];

        for (let i = 0; i < k; i++) {
            if (remainingItems.length === 0) {
                break;
            }

            const weights = remainingItems.map(getWeight);
            const totalWeight = weights.reduce((sum, w) => sum + Math.max(w, 0.1), 0); // Avoid zero weights

            const r = Math.random() * totalWeight;
            let cumulative = 0;
            let selectedIdx = -1;

            for (let j = 0; j < weights.length; j++) {
                cumulative += Math.max(weights[j], 0.1);
                if (r <= cumulative) {
                    selectedIdx = j;
                    break;
                }
            }

            if (selectedIdx >= 0) {
                result.push(remainingItems[selectedIdx]);
                remainingItems.splice(selectedIdx, 1);
            }
        }

        return result;
    }

    private async weightedBalancedStrategy(
        userId: string,
        count: number,
        prefs: any,
        baseConditions: any[],
    ): Promise<Question[]> {
        const excluded =
            prefs.excludedSubjectIds.length > 0 ? prefs.excludedSubjectIds : ['00000000-0000-0000-0000-000000000000'];

        const candidates = await this.fetchCandidateQuestionsWithMetadata(userId, baseConditions, excluded, { limit: count * 5 });

        return this.weightedSample(candidates, count, this.computeWeight);
    }

    private async weakAreaWeightedStrategy(
        userId: string,
        count: number,
        prefs: any,
        baseConditions: any[],
    ): Promise<Question[]> {
        const allTopicProgress = await this.db
            .select({
                topicId: userTopicProgress.topicId,
                accuracy: userTopicProgress.accuracy,
                questionsAttempted: userTopicProgress.questionsAttempted,
            })
            .from(userTopicProgress)
            .where(eq(userTopicProgress.userId, userId));

        const weakTopics: UserTopicProgressWithId[] = allTopicProgress
            .filter(
                (tp) =>
                    tp.questionsAttempted >= prefs.minQuestionsForWeakDetection &&
                    parseFloat(tp.accuracy) < prefs.weakAreaThreshold,
            )
            .sort((a, b) => parseFloat(a.accuracy) - parseFloat(b.accuracy))
            .slice(0, 20);

        if (weakTopics.length === 0) {
            return this.weightedBalancedStrategy(userId, count, prefs, baseConditions);
        }

        const topicIds = weakTopics.map((t) => t.topicId);
        const excluded =
            prefs.excludedSubjectIds.length > 0 ? prefs.excludedSubjectIds : ['00000000-0000-0000-0000-000000000000'];

        const candidates = await this.fetchCandidateQuestionsWithMetadata(userId, baseConditions, excluded, {
            topicIds,
            limit: count * 5,
        });

        return this.weightedSample(candidates, count, this.computeWeight);
    }

    private async adaptiveWithWeightageStrategy(
        userId: string,
        count: number,
        prefs: any,
        baseConditions: any[],
    ): Promise<Question[]> {
        const allTopicProgress = await this.db
            .select({
                accuracy: userTopicProgress.accuracy,
            })
            .from(userTopicProgress)
            .where(eq(userTopicProgress.userId, userId));

        const avgAccuracy =
            allTopicProgress.length > 0
                ? allTopicProgress.reduce((sum, tp) => sum + parseFloat(tp.accuracy), 0) / allTopicProgress.length
                : 60;
        const targetDiff = avgAccuracy > 75 ? 4 : avgAccuracy > 50 ? 3 : avgAccuracy > 30 ? 2 : 1;

        const excluded =
            prefs.excludedSubjectIds.length > 0 ? prefs.excludedSubjectIds : ['00000000-0000-0000-0000-000000000000'];

        const candidates = await this.fetchCandidateQuestionsWithMetadata(userId, baseConditions, excluded, { limit: count * 4 });

        const getAdaptiveWeight = (q: QuestionWithMetadata) =>
            this.computeWeight(q) * Math.pow(1 + Math.abs(q.difficulty - targetDiff), -2);

        return this.weightedSample(candidates, count, getAdaptiveWeight);
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

        const excluded =
            prefs.excludedSubjectIds.length > 0 ? prefs.excludedSubjectIds : ['00000000-0000-0000-0000-000000000000'];

        const candidates = await this.fetchCandidateQuestionsWithMetadata(userId, baseConditions, excluded, {
            subjectIds,
            limit: count * 5,
        });

        return this.weightedSample(candidates, count, this.computeWeight);
    }

    private async hardCoreWeightedStrategy(
        userId: string,
        count: number,
        prefs: any,
        baseConditions: any[],
    ): Promise<Question[]> {
        const excluded =
            prefs.excludedSubjectIds.length > 0 ? prefs.excludedSubjectIds : ['00000000-0000-0000-0000-000000000000'];

        const candidates = await this.fetchCandidateQuestionsWithMetadata(userId, baseConditions, excluded, {
            minDifficulty: 4,
            limit: count * 5,
        });

        return this.weightedSample(candidates, count, this.computeWeight);
    }
}
