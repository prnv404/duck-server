// src/quiz/quiz-session.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { and, eq, gte, sql, inArray } from 'drizzle-orm';
import * as Database from '@/database';
import {
  quizSessions,
  sessionAnswers,
  questions,
  answerOptions,
  userQuestionHistory,
  userStats,
  userTopicProgress,
  streakCalendar,
  users,
  userQuizPreferences,
  type QuizSession,
  type SessionAnswer,
  type Question,
} from '@/database/schema';
import { QuestionGenerationService, QuestionPreferenceType } from '@/modules/question/question.service';
import { BadRequestError } from '@/common/exceptions';

export interface StartQuizDto {
  userId: string;
  type: QuestionPreferenceType;
  totalQuestions?: number;
  topicId?: string;
  subjectIds?: string[];
}

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

  async startQuiz(dto: StartQuizDto): Promise<QuizSession & { questions: Question[] }> {
    const { userId, type, totalQuestions = 10, topicId, subjectIds } = dto;

    const [user, preferences] = await Promise.all([
      this.db.select().from(users).where(eq(users.id, userId)).limit(1),
      this.db.select().from(userQuizPreferences).where(eq(userQuizPreferences.userId, userId)).limit(1),
    ]);

    if (!user[0]) throw new NotFoundException('User not found');

    const questionCount = totalQuestions ?? preferences[0]?.defaultQuestionsPerSession ?? 10;

    const generatedQuestions = await this.questionGen.generateQuestions({
      userId,
      count: questionCount,
      type,
      topicId,
      subjectIds,
    });

    if (generatedQuestions.length === 0) {
      throw new BadRequestError('Not enough questions available for this mode');
    }

    const [session] = await this.db
      .insert(quizSessions)
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
      this.db.select().from(quizSessions).where(eq(quizSessions.id, sessionId)).limit(1),
      this.db.select().from(questions).where(eq(questions.id, questionId)).limit(1),
      this.db
        .select()
        .from(sessionAnswers)
        .where(and(eq(sessionAnswers.sessionId, sessionId), eq(sessionAnswers.questionId, questionId)))
        .limit(1),
    ]);

    const session = sessionResult[0];
    const question = questionResult[0];

    if (!session) throw new NotFoundException('Session not found');
    if (!question) throw new NotFoundException('Question not found');
    if (session.status !== 'in_progress') throw new BadRequestException('Session is not active');
    if (existingAnswer[0]) throw new BadRequestException('Question already answered');

    // Find correct option from answer_options table
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

    // Update session stats
    await this.db
      .update(quizSessions)
      .set({
        questionsAttempted: sql`${quizSessions.questionsAttempted} + 1`,
        correctAnswers: isCorrect ? sql`${quizSessions.correctAnswers} + 1` : quizSessions.correctAnswers,
        wrongAnswers: isCorrect ? quizSessions.wrongAnswers : sql`${quizSessions.wrongAnswers} + 1`,
        accuracy: sql`ROUND(
          (CAST(${quizSessions.correctAnswers} + ${isCorrect ? 1 : 0} AS FLOAT) /
           CAST(${quizSessions.questionsAttempted} + 1 AS FLOAT)) * 100,
          2
        )`,
        timeSpentSeconds: sql`COALESCE(${quizSessions.timeSpentSeconds}, 0) + ${timeSpentSeconds}`,
      })
      .where(eq(quizSessions.id, sessionId));

    return answer;
  }

  async completeSession(sessionId: string): Promise<QuizSession> {
    const [sessionResult] = await this.db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.id, sessionId))
      .limit(1);

    const session = sessionResult;
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'completed') return session;

    const answers = await this.db
      .select()
      .from(sessionAnswers)
      .where(eq(sessionAnswers.sessionId, sessionId));

    const correctCount = answers.filter(a => a.isCorrect).length;
    const timeSpentSeconds = session.timeSpentSeconds ?? 0;
    const xpEarned = correctCount * 10 + Math.floor(timeSpentSeconds / 60) * 2;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    await this.db.transaction(async (tx) => {
      // 1. Complete session
      await tx
        .update(quizSessions)
        .set({
          status: 'completed',
          completedAt: today,
          xpEarned,
          accuracy:
            session.totalQuestions > 0
              ? ((correctCount / session.totalQuestions) * 100).toFixed(2)
              : '0.00',
        })
        .where(eq(quizSessions.id, sessionId));

      // 2. Update user stats
      await tx
        .update(userStats)
        .set({
          totalXp: sql`${userStats.totalXp} + ${xpEarned}`,
          totalQuizzesCompleted: sql`${userStats.totalQuizzesCompleted} + 1`,
          totalQuestionsAttempted: sql`${userStats.totalQuestionsAttempted} + ${session.totalQuestions}`,
          totalCorrectAnswers: sql`${userStats.totalCorrectAnswers} + ${correctCount}`,
          overallAccuracy: sql`ROUND(
            (CAST(${userStats.totalCorrectAnswers} + ${correctCount} AS FLOAT) /
             CAST(${userStats.totalQuestionsAttempted} + ${session.totalQuestions} AS FLOAT)) * 100,
            2
          )`,
          totalPracticeTimeMinutes: sql`${userStats.totalPracticeTimeMinutes} + ${Math.floor(timeSpentSeconds / 60)}`,
        })
        .where(eq(userStats.userId, session.userId));

      // 3. Update question history
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

      // 4. Update topic progress
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
                accuracy: sql`ROUND(
                  (CAST(${userTopicProgress.correctAnswers} + ${ans.isCorrect ? 1 : 0} AS FLOAT) /
                   CAST(${userTopicProgress.questionsAttempted} + 1 AS FLOAT)) * 100,
                  2
                )`,
                lastPracticedAt: today,
              },
            });
        }
      }

      // 5. Update streak
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

      // 6. Update current/longest streak
      await tx
        .update(userStats)
        .set({
          currentStreak: sql`
            CASE
              WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}' - INTERVAL '1 day' THEN ${userStats.currentStreak} + 1
              WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}' THEN ${userStats.currentStreak}
              ELSE 1
            END
          `,
          longestStreak: sql`
            GREATEST(
              ${userStats.longestStreak},
              CASE
                WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}' - INTERVAL '1 day' THEN ${userStats.currentStreak} + 1
                WHEN ${userStats.lastActivityDate}::date = DATE '${todayStr}' THEN ${userStats.currentStreak}
                ELSE 1
              END
            )
          `,
          lastActivityDate: sql`DATE '${todayStr}'`,
        })
        .where(eq(userStats.userId, session.userId));
    });

    const [updated] = await this.db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.id, sessionId));

    return updated;
  }

  async getActiveSession(userId: string): Promise<QuizSession | null> {
    const [session] = await this.db
      .select()
      .from(quizSessions)
      .where(and(eq(quizSessions.userId, userId), eq(quizSessions.status, 'in_progress')))
      .orderBy(sql`created_at DESC`)
      .limit(1);

    return session || null;
  }
}