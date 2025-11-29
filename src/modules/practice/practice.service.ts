// src/quiz/quiz-session.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, gte, sql, inArray } from 'drizzle-orm';
import * as Database from '@/database';
import {
    practiceSessions,
    sessionAnswers,
    questions,
    answerOptions,
    userQuestionHistory,
    userStats,
    userTopicProgress,
    streakCalendar,
    users,
    userQuizPreferences,
    type PracticeSession,
    type SessionAnswer,
    type Question,
} from '@/database/schema';
import { QuestionGenerationService, QuestionWithAnswers } from '@/modules/question/question.service';
import { BadRequestError, NotFoundError } from '@/common/exceptions';
import { CreateQuizSessionInput } from './practice.dto';
import { QuestionModel } from '../question/models/question.model';

export interface SubmitAnswerDto {
    sessionId: string;
    questionId: string;
    selectedOptionId: string | null;
    timeSpentSeconds: number;
}

@Injectable()
export class QuizSessionService {
    constructor(
        @Inject(Database.DRIZZLE)
        private readonly db: Database.DrizzleDB,
        private readonly questionGen: QuestionGenerationService,
    ) {}

    async startQuiz(dto: CreateQuizSessionInput): Promise<PracticeSession & { questions: QuestionModel[] }> {
        const { userId, type, totalQuestions = 10, topicId, subjectIds } = dto;

        console.log(dto);

        const [user, preferences] = await Promise.all([
            this.db.select().from(users).where(eq(users.id, userId)).limit(1),
            this.db.select().from(userQuizPreferences).where(eq(userQuizPreferences.userId, userId)).limit(1),
        ]);

        if (!user[0]) throw new NotFoundError('User not found');

        const questionCount = totalQuestions ?? preferences[0]?.defaultQuestionsPerSession ?? 10;

        const generatedQuestions = await this.questionGen.generateQuestions({
            userId,
            count: questionCount,
            type,
            topicId,
            subjectIds,
        });

        console.log(generatedQuestions);

        if (generatedQuestions.length === 0) {
            throw new BadRequestError('Not enough questions available for this mode');
        }

        const [session] = await this.db
            .insert(practiceSessions)
            .values({
                userId,
                sessionType: type,
                topicId: topicId || null,
                totalQuestions: generatedQuestions.length,
                questionsAttempted: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                accuracy: '0.00',
                xpEarned: 0,
                status: 'in_progress',
                timeSpentSeconds: 0,
                subjectDistribution: {},
                topicDistribution: {},
            })
            .returning();

        return { ...session, questions: generatedQuestions };
    }

    async submitAnswer(dto: SubmitAnswerDto): Promise<SessionAnswer> {
        const { sessionId, questionId, selectedOptionId, timeSpentSeconds } = dto;

        const [sessionResult, questionResult, existingAnswer] = await Promise.all([
            this.db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId)).limit(1),
            this.db.select().from(questions).where(eq(questions.id, questionId)).limit(1),
            this.db
                .select()
                .from(sessionAnswers)
                .where(and(eq(sessionAnswers.sessionId, sessionId), eq(sessionAnswers.questionId, questionId)))
                .limit(1),
        ]);

        const session = sessionResult[0];
        const question = questionResult[0];

        if (!session) throw new NotFoundError('Session not found');
        if (!question) throw new NotFoundError('Question not found');
        if (session.status !== 'in_progress') throw new BadRequestError('Session is not active');
        if (existingAnswer[0]) throw new BadRequestError('Question already answered');

        const correctOption = await this.db
            .select()
            .from(answerOptions)
            .where(and(eq(answerOptions.questionId, questionId), eq(answerOptions.isCorrect, true)))
            .limit(1);

        const isCorrect = correctOption[0]?.id === selectedOptionId;

        const [answer] = await this.db
            .insert(sessionAnswers)
            .values({
                sessionId,
                questionId,
                selectedOptionId: selectedOptionId || null,
                isCorrect,
                timeSpentSeconds,
            })
            .returning();

        await this.db
            .update(practiceSessions)
            .set({
                questionsAttempted: sql`${practiceSessions.questionsAttempted} + 1`,

                correctAnswers: isCorrect ? sql`${practiceSessions.correctAnswers} + 1` : practiceSessions.correctAnswers,

                wrongAnswers: isCorrect ? practiceSessions.wrongAnswers : sql`${practiceSessions.wrongAnswers} + 1`,

                accuracy: sql`
                    ROUND(
                        (CAST(${practiceSessions.correctAnswers} + ${isCorrect ? 1 : 0} AS FLOAT) /
                         CAST(${practiceSessions.questionsAttempted} + 1 AS FLOAT)) * 100,
                        2
                    )
                `,

                timeSpentSeconds: sql`
                    COALESCE(${practiceSessions.timeSpentSeconds}, 0)
                    + ${timeSpentSeconds}
                `,
            })
            .where(eq(practiceSessions.id, sessionId));

        return answer;
    }

    async completeSession(sessionId: string): Promise<PracticeSession> {
        const [sessionResult] = await this.db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId)).limit(1);

        const session = sessionResult;
        if (!session) throw new NotFoundError('Session not found');
        if (session.status === 'completed') return session;

        const answers = await this.db.select().from(sessionAnswers).where(eq(sessionAnswers.sessionId, sessionId));

        const correctCount = answers.filter((a) => a.isCorrect).length;
        const timeSpentSeconds = session.timeSpentSeconds ?? 0;
        const xpEarned = correctCount * 10 + Math.floor(timeSpentSeconds / 60) * 2;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        await this.db.transaction(async (tx) => {
            await tx
                .update(practiceSessions)
                .set({
                    status: 'completed',
                    completedAt: today,
                    xpEarned,
                    accuracy: session.totalQuestions > 0 ? ((correctCount / session.totalQuestions) * 100).toFixed(2) : '0.00',
                })
                .where(eq(practiceSessions.id, sessionId));

            await tx
                .update(userStats)
                .set({
                    totalXp: sql`${userStats.totalXp} + ${xpEarned}`,
                    totalQuizzesCompleted: sql`${userStats.totalQuizzesCompleted} + 1`,
                    totalQuestionsAttempted: sql`${userStats.totalQuestionsAttempted} + ${session.totalQuestions}`,
                    totalCorrectAnswers: sql`${userStats.totalCorrectAnswers} + ${correctCount}`,

                    overallAccuracy: sql`
                        ROUND(
                            (CAST(${userStats.totalCorrectAnswers} + ${correctCount} AS FLOAT) /
                             CAST(${userStats.totalQuestionsAttempted} + ${session.totalQuestions} AS FLOAT)) * 100,
                            2
                        )
                    `,

                    totalPracticeTimeMinutes: sql`
                        ${userStats.totalPracticeTimeMinutes}
                        + ${Math.floor(timeSpentSeconds / 60)}
                    `,
                })
                .where(eq(userStats.userId, session.userId));

            for (const ans of answers) {
                await tx
                    .insert(userQuestionHistory)
                    .values({
                        userId: session.userId,
                        questionId: ans.questionId,
                        timesSeen: 1,
                        timesCorrect: ans.isCorrect ? 1 : 0,
                        lastSeenAt: today,
                    })
                    .onConflictDoUpdate({
                        target: [userQuestionHistory.userId, userQuestionHistory.questionId],
                        set: {
                            timesSeen: sql`${userQuestionHistory.timesSeen} + 1`,
                            timesCorrect: sql`${userQuestionHistory.timesCorrect} + ${ans.isCorrect ? 1 : 0}`,
                            lastSeenAt: today,
                        },
                    });
            }

            for (const ans of answers) {
                const [q] = await tx
                    .select({ topicId: questions.topicId })
                    .from(questions)
                    .where(eq(questions.id, ans.questionId))
                    .limit(1);

                if (q?.topicId) {
                    await tx
                        .insert(userTopicProgress)
                        .values({
                            userId: session.userId,
                            topicId: q.topicId,
                            questionsAttempted: 1,
                            correctAnswers: ans.isCorrect ? 1 : 0,
                            accuracy: ans.isCorrect ? '100.00' : '0.00',
                            lastPracticedAt: today,
                        })
                        .onConflictDoUpdate({
                            target: [userTopicProgress.userId, userTopicProgress.topicId],
                            set: {
                                questionsAttempted: sql`${userTopicProgress.questionsAttempted} + 1`,
                                correctAnswers: sql`${userTopicProgress.correctAnswers} + ${ans.isCorrect ? 1 : 0}`,

                                accuracy: sql`
                                    ROUND(
                                        (CAST(${userTopicProgress.correctAnswers} + ${ans.isCorrect ? 1 : 0} AS FLOAT) /
                                         CAST(${userTopicProgress.questionsAttempted} + 1 AS FLOAT)) * 100,
                                        2
                                    )
                                `,

                                lastPracticedAt: today,
                            },
                        });
                }
            }

            await tx
                .insert(streakCalendar)
                .values({
                    userId: session.userId,
                    activityDate: todayStr as any,
                    quizzesCompleted: 1,
                    questionsAnswered: session.totalQuestions,
                    xpEarned,
                })
                .onConflictDoUpdate({
                    target: [streakCalendar.userId, streakCalendar.activityDate],
                    set: {
                        quizzesCompleted: sql`${streakCalendar.quizzesCompleted} + 1`,
                        questionsAnswered: sql`${streakCalendar.questionsAnswered} + ${session.totalQuestions}`,
                        xpEarned: sql`${streakCalendar.xpEarned} + ${xpEarned}`,
                    },
                });

            await tx
                .update(userStats)
                .set({
                    currentStreak: sql`
                        CASE
                            WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}' - INTERVAL '1 day'
                                THEN ${userStats.currentStreak} + 1
                            WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}'
                                THEN ${userStats.currentStreak}
                            ELSE 1
                        END
                    `,

                    longestStreak: sql`
                        GREATEST(
                            ${userStats.longestStreak},
                            CASE
                                WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}' - INTERVAL '1 day'
                                    THEN ${userStats.currentStreak} + 1
                                WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}'
                                    THEN ${userStats.currentStreak}
                                ELSE 1
                            END
                        )
                    `,

                    lastActivityDate: sql`DATE '${todayStr}'`,
                })
                .where(eq(userStats.userId, session.userId));
        });

        const [updated] = await this.db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
        return updated;
    }

    async getActiveSession(userId: string): Promise<PracticeSession | null> {
        const [session] = await this.db
            .select()
            .from(practiceSessions)
            .where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.status, 'in_progress')))
            .orderBy(sql`created_at DESC`)
            .limit(1);

        return session || null;
    }
}
