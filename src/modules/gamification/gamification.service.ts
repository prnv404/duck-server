// src/modules/gamification/gamification.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lt, sql, count } from 'drizzle-orm';
import * as Database from '@/database';
import {
  userStats,
  streakCalendar,
  userTopicProgress,
  userBadges,
  badges,
  quizSessions,
  topics,
  subjects,
} from '@/database/schema';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(@Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB) {}

  async processQuizCompletion(
    userId: string,
    session: {
      id: string;
      correctAnswers: number;
      questionsAttempted: number;
      xpEarned: number;
      timeSpentSeconds: number;
      accuracy: number;
      topicId?: string | null;
      subjectName?: string | null;
      completedAt: Date;
    },
  ) {
    return this.db.transaction(async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.updateXpAndLevel(tx, userId, session);
      await this.maintainStreak(tx, userId, today, session);
      if (session.topicId) await this.updateTopicProgress(tx, userId, session.topicId, session);

      const unlockedBadges = await this.evaluateAllBadgesDynamically(tx, userId, session);

      return {
        xpGained: session.xpEarned,
        badgesUnlocked: unlockedBadges,
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Fully Dynamic Badge Evaluation — Add 1000 badges → just works
  // ──────────────────────────────────────────────────────────────────────
  private async evaluateAllBadgesDynamically(tx: any, userId: string, session: any) {
    const unlocked: any[] = [];
    const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });

    const allBadges = await tx.query.badges.findMany();

    for (const badge of allBadges) {
      const criteria = badge.unlockCriteria as any;

      const existing = await tx.query.userBadges.findFirst({
        where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)),
      });
      if (existing?.unlockedAt) continue;

      let isUnlocked = false;

      try {
        isUnlocked = await this.evaluateCriteria(tx, userId, session, stats, criteria);
      } catch (err) {
        this.logger.warn(`Badge ${badge.name} evaluation failed`, err);
        continue;
      }

      if (isUnlocked) {
        await tx
          .insert(userBadges)
          .values({
            userId,
            badgeId: badge.id,
            progressPercentage: '100.00',
            unlockedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [userBadges.userId, userBadges.badgeId],
            set: { progressPercentage: '100.00', unlockedAt: new Date() },
          });

        if (badge.xpReward > 0) {
          await tx
            .update(userStats)
            .set({ totalXp: sql`${userStats.totalXp} + ${badge.xpReward}` })
            .where(eq(userStats.userId, userId));
        }

        unlocked.push(badge);
      }
    }

    return unlocked;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Dynamic Criteria Evaluator — One function for ALL badge types
  // ──────────────────────────────────────────────────────────────────────
  private async evaluateCriteria(
    tx: any,
    userId: string,
    session: any,
    stats: any,
    criteria: any,
  ): Promise<boolean> {
    switch (criteria.type) {
      case 'streak':
        return stats.currentStreak >= (criteria.days ?? 0);

      case 'accuracy':
        return (
          session.accuracy >= (criteria.percentage ?? 0) &&
          session.questionsAttempted >= (criteria.min_questions ?? 0)
        );

      case 'quiz_count':
        const quizCount = criteria.in_single_session
          ? session.questionsAttempted
          : stats.totalQuizzesCompleted;
        return quizCount >= (criteria.count ?? 0);

      case 'subject_master':
        if (!criteria.subject) return false;

        const result = await tx
          .select({ count: count() })
          .from(quizSessions)
          .innerJoin(topics, eq(quizSessions.topicId, topics.id))
          .innerJoin(subjects, eq(topics.subjectId, subjects.id))
          .where(
            and(
              eq(quizSessions.userId, userId),
              eq(subjects.name, criteria.subject), // ← Now safe: criteria.subject is checked
              eq(quizSessions.status, 'completed'),
            ),
          );

        return (result[0]?.count || 0) >= (criteria.count ?? 0);

      // Add more cases anytime (speed, time_of_day, leaderboard, etc.)
      default:
        this.logger.warn(`Unsupported badge type: ${criteria.type}`);
        return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Keep your existing helpers (unchanged)
  // ──────────────────────────────────────────────────────────────────────
  private async updateXpAndLevel(tx: any, userId: string, session: any) {
    const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
    const newTotalXp = stats.totalXp + session.xpEarned;
    let newLevel = stats.level;
    while (newTotalXp >= this.xpRequiredForLevel(newLevel + 1)) newLevel++;

    await tx
      .update(userStats)
      .set({
        totalXp: newTotalXp,
        level: newLevel,
        xpToNextLevel: this.xpRequiredForLevel(newLevel + 1) - newTotalXp,
        totalQuizzesCompleted: sql`${userStats.totalQuizzesCompleted} + 1`,
        totalQuestionsAttempted: sql`${userStats.totalQuestionsAttempted} + ${session.questionsAttempted}`,
        totalCorrectAnswers: sql`${userStats.totalCorrectAnswers} + ${session.correctAnswers}`,
        overallAccuracy: sql`ROUND((${userStats.totalCorrectAnswers} + ${session.correctAnswers})::decimal / NULLIF((${userStats.totalQuestionsAttempted} + ${session.questionsAttempted}), 0), 2)`,
        totalPracticeTimeMinutes: sql`${userStats.totalPracticeTimeMinutes} + ${Math.floor(session.timeSpentSeconds / 60)}`,
      })
      .where(eq(userStats.userId, userId));
  }

  private xpRequiredForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) total += Math.floor(100 * Math.pow(1.15, i - 1));
    return total;
  }

  private async maintainStreak(tx: any, userId: string, today: Date, session: any) {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const existing = await tx.query.streakCalendar.findFirst({
      where: and(eq(streakCalendar.userId, userId), gte(streakCalendar.activityDate, today), lt(streakCalendar.activityDate, tomorrow)),
    });
    if (existing) return;

    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEntry = await tx.query.streakCalendar.findFirst({
      where: and(eq(streakCalendar.userId, userId), gte(streakCalendar.activityDate, yesterday), lt(streakCalendar.activityDate, today)),
    });

    const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
    const newStreak = yesterdayEntry ? stats.currentStreak + 1 : 1;

    await tx.insert(streakCalendar).values({
      userId,
      activityDate: today,
      quizzesCompleted: 1,
      questionsAnswered: session.questionsAttempted,
      xpEarned: session.xpEarned,
    });

    await tx
      .update(userStats)
      .set({
        currentStreak: newStreak,
        longestStreak: sql`GREATEST(${stats.longestStreak}, ${newStreak})`,
        lastActivityDate: today,
      })
      .where(eq(userStats.userId, userId));
  }

  private async updateTopicProgress(tx: any, userId: string, topicId: string, session: any) {
    const existing = await tx.query.userTopicProgress.findFirst({
      where: and(eq(userTopicProgress.userId, userId), eq(userTopicProgress.topicId, topicId)),
    });

    const totalAttempted = (existing?.questionsAttempted || 0) + session.questionsAttempted;
    const totalCorrect = (existing?.correctAnswers || 0) + session.correctAnswers;
    const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

    await tx
      .insert(userTopicProgress)
      .values({
        userId,
        topicId,
        questionsAttempted: session.questionsAttempted,
        correctAnswers: session.correctAnswers,
        accuracy: accuracy.toFixed(2),
        lastPracticedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userTopicProgress.userId, userTopicProgress.topicId],
        set: {
          questionsAttempted: totalAttempted,
          correctAnswers: totalCorrect,
          accuracy: accuracy.toFixed(2),
          lastPracticedAt: new Date(),
        },
      });
  }
}