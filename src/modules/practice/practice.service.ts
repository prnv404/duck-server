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
    user,
    userQuizPreferences,
    type PracticeSession,
    type SessionAnswer,
    type Question,
} from '@/database/schema';
import { QuestionService, QuestionWithAnswers } from '@/modules/question/question.service';
import { BadRequestError, NotFoundError } from '@/common/exceptions';
import { CreateSessionInput } from './practice.dto';
import { GamificationService } from '@/modules/gamification/gamification.service';

export interface SubmitAnswerDto {
    sessionId: string;
    questionId: string;
    selectedOptionId: string | null;
    timeSpentSeconds: number;
}

export interface QuestionWithTopicName extends QuestionWithAnswers {
    topicName: string;
}

@Injectable()
export class QuizSessionService {
    constructor(
        @Inject(Database.DRIZZLE)
        private readonly db: Database.DrizzleDB,
        private readonly questionGen: QuestionService,
        private readonly gamificationService: GamificationService,
    ) {}

    async getPracticeSession(sessionId: string): Promise<PracticeSession> {
        const [sessionResult] = await this.db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId)).limit(1);

        const session = sessionResult;

        if (!session) throw new NotFoundError('Session not found');

        return session;
    }

    async createPracticeSession(dto: CreateSessionInput): Promise<PracticeSession & { questions: QuestionWithTopicName[] }> {
        const { userId, type, totalQuestions = 10, topicId, subjectIds } = dto;

        console.log(dto);

        const [_user, preferences] = await Promise.all([
            this.db.select().from(user).where(eq(user.id, userId)).limit(1),
            this.db.select().from(userQuizPreferences).where(eq(userQuizPreferences.userId, userId)).limit(1),
        ]);

        if (!_user[0]) throw new NotFoundError('User not found');

        const questionCount = totalQuestions ?? preferences[0]?.defaultQuestionsPerSession ?? 10;

        const generatedQuestions = (await this.questionGen.generateQuestions({
            userId,
            count: questionCount,
            type,
            topicId,
            subjectIds,
        })) as QuestionWithTopicName[];
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

        // Calculate accuracy in JavaScript
        const currentCorrect = session.correctAnswers + (isCorrect ? 1 : 0);
        const currentAttempted = session.questionsAttempted + 1;
        const newAccuracy = ((currentCorrect / currentAttempted) * 100).toFixed(2);

        await this.db
            .update(practiceSessions)
            .set({
                questionsAttempted: currentAttempted,
                correctAnswers: isCorrect ? session.correctAnswers + 1 : session.correctAnswers,
                wrongAnswers: isCorrect ? session.wrongAnswers : session.wrongAnswers + 1,
                accuracy: newAccuracy,
                timeSpentSeconds: (session.timeSpentSeconds || 0) + timeSpentSeconds,
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
        const actualAnsweredCount = answers.length;
        const timeSpentSeconds = session.timeSpentSeconds ?? 0;
        const xpEarned = correctCount * 10 + Math.floor(timeSpentSeconds / 60) * 2;
        const accuracy = actualAnsweredCount > 0 ? ((correctCount / actualAnsweredCount) * 100).toFixed(2) : '0.00';
        const today = new Date();

        // Prepare session object for gamification service
        const completedSession = {
            ...session,
            status: 'completed',
            completedAt: today,
            xpEarned,
            accuracy,
            questionsAttempted: actualAnsweredCount,
            correctAnswers: correctCount,
            timeSpentSeconds,
        };

        await this.db.transaction(async (tx) => {
            // 1. Update practice session status
            await tx
                .update(practiceSessions)
                .set({
                    status: 'completed',
                    completedAt: today,
                    xpEarned,
                    accuracy,
                })
                .where(eq(practiceSessions.id, sessionId));

            // 2. Process Gamification (XP, Level, Streaks, Badges)
            // We cast to PracticeSession to ensure type compatibility
            await this.gamificationService.processSessionGamification(session.userId, completedSession as PracticeSession, tx);

            // 3. Update user question history
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

            // 4. Update user topic progress
            for (const ans of answers) {
                const [q] = await tx
                    .select({ topicId: questions.topicId })
                    .from(questions)
                    .where(eq(questions.id, ans.questionId))
                    .limit(1);

                if (q?.topicId) {
                    // Fetch current topic progress
                    const [currentProgress] = await tx
                        .select()
                        .from(userTopicProgress)
                        .where(and(eq(userTopicProgress.userId, session.userId), eq(userTopicProgress.topicId, q.topicId)))
                        .limit(1);

                    const newTopicCorrect = (currentProgress?.correctAnswers || 0) + (ans.isCorrect ? 1 : 0);
                    const newTopicAttempted = (currentProgress?.questionsAttempted || 0) + 1;
                    const newTopicAccuracy = ((newTopicCorrect / newTopicAttempted) * 100).toFixed(2);

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
                                questionsAttempted: newTopicAttempted,
                                correctAnswers: newTopicCorrect,
                                accuracy: newTopicAccuracy,
                                lastPracticedAt: today,
                            },
                        });
                }
            }
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
