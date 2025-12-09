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
    practiceSessions,
    topics,
    subjects,
    type PracticeSession,
    type Badge,
} from '@/database/schema';
import { ServiceHelper } from '@/common/utils';
import { BadgeCriteria, DrizzleTransaction } from './types/gamification.types';
import { UserStats } from '@/database/schema';

export interface StreakCalendarData {
    currentStreak: number;
    longestStreak: number;
    calendar: (typeof streakCalendar.$inferSelect)[]; // Array of streak calendar entries, sorted by date
}

@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    constructor(@Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB) { }

    // ──────────────────────────────────────────────────────────────────────
    // Orchestrator
    // ──────────────────────────────────────────────────────────────────────
    async processSessionGamification(userId: string, session: PracticeSession, tx: DrizzleTransaction) {
        // 1. Update XP and Level
        await this.updateXpAndLevel(tx, userId, session);

        // 2. Maintain Streak
        const today = new Date();
        await this.maintainStreak(tx, userId, today, session);

        // 3. Evaluate Badges
        const unlockedBadges = await this.evaluateAllBadgesDynamically(tx, userId, session);

        return { unlockedBadges };
    }

    // ──────────────────────────────────────────────────────────────────────
    // Fully Dynamic Badge Evaluation — Add 1000 badges → just works
    // ──────────────────────────────────────────────────────────────────────
    public async evaluateAllBadgesDynamically(tx: DrizzleTransaction, userId: string, session: PracticeSession) {
        const unlocked: Badge[] = [];
        const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });

        if (!stats) return [];

        const allBadges = await tx.query.badges.findMany();

        for (const badge of allBadges) {
            const criteria = badge.unlockCriteria as unknown as BadgeCriteria;

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
        tx: DrizzleTransaction,
        userId: string,
        session: PracticeSession,
        stats: UserStats,
        criteria: BadgeCriteria,
    ): Promise<boolean> {
        switch (criteria.type) {
            case 'streak':
                return stats.currentStreak >= (criteria.days ?? 0);

            case 'accuracy':
                return (
                    parseFloat(session.accuracy) >= (criteria.percentage ?? 0) &&
                    session.questionsAttempted >= (criteria.min_questions ?? 0)
                );

            case 'quiz_count':
                const quizCount = criteria.in_single_session ? session.questionsAttempted : stats.totalQuizzesCompleted;
                return quizCount >= (criteria.count ?? 0);

            case 'subject_master':
                if (!criteria.subject) return false;

                const result = await tx
                    .select({ count: count() })
                    .from(practiceSessions)
                    .innerJoin(topics, eq(practiceSessions.topicId, topics.id))
                    .innerJoin(subjects, eq(topics.subjectId, subjects.id))
                    .where(
                        and(
                            eq(practiceSessions.userId, userId),
                            eq(subjects.name, criteria.subject), // ← Now safe: criteria.subject is checked
                            eq(practiceSessions.status, 'completed'),
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
    public async updateXpAndLevel(tx: DrizzleTransaction, userId: string, session: PracticeSession) {
        const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
        if (!stats) return;

        const newTotalXp = stats.totalXp + (session.xpEarned || 0);
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
                overallAccuracy: sql`ROUND(((${userStats.totalCorrectAnswers} + ${session.correctAnswers})::decimal / NULLIF((${userStats.totalQuestionsAttempted} + ${session.questionsAttempted}), 0)) * 100, 2)`,
                totalPracticeTimeMinutes: sql`${userStats.totalPracticeTimeMinutes} + ${Math.floor((session.timeSpentSeconds || 0) / 60)}`,
            })
            .where(eq(userStats.userId, userId));
    }

    private xpRequiredForLevel(level: number): number {
        let total = 0;
        for (let i = 1; i < level; i++) total += Math.floor(100 * Math.pow(1.15, i - 1));
        return total;
    }

    public async maintainStreak(tx: DrizzleTransaction, userId: string, dateArg: Date, session: PracticeSession) {
        // Use UTC to avoid timezone issues - normalize to start of day in UTC
        const today = new Date(dateArg);
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

        const tomorrowUTC = new Date(todayUTC);
        tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

        const existing = await tx.query.streakCalendar.findFirst({
            where: and(
                eq(streakCalendar.userId, userId),
                gte(streakCalendar.activityDate, todayUTC),
                lt(streakCalendar.activityDate, tomorrowUTC),
            ),
        });
        if (existing) return;

        const yesterdayUTC = new Date(todayUTC);
        yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
        const yesterdayEntry = await tx.query.streakCalendar.findFirst({
            where: and(
                eq(streakCalendar.userId, userId),
                gte(streakCalendar.activityDate, yesterdayUTC),
                lt(streakCalendar.activityDate, todayUTC),
            ),
        });

        const stats = await tx.query.userStats.findFirst({ where: eq(userStats.userId, userId) });
        if (!stats) return;

        const newStreak = yesterdayEntry ? stats.currentStreak + 1 : 1;

        await tx.insert(streakCalendar).values({
            userId,
            activityDate: todayUTC,
            quizzesCompleted: 1,
            questionsAnswered: session.questionsAttempted,
            xpEarned: session.xpEarned || 0,
        });

        await tx
            .update(userStats)
            .set({
                currentStreak: newStreak,
                longestStreak: Math.max(stats.longestStreak, newStreak),
                lastActivityDate: todayUTC,
            })
            .where(eq(userStats.userId, userId));
    }

    async getStreakCalendar(userId: string): Promise<StreakCalendarData> {
        const [userStat] = await this.db.select().from(userStats).where(eq(userStats.userId, userId));

        ServiceHelper.ensureExists(userStat, userId, 'User Stats');

        const calendarEntries = await this.db
            .select()
            .from(streakCalendar)
            .where(eq(streakCalendar.userId, userId))
            .orderBy(streakCalendar.activityDate);

        return {
            currentStreak: userStat.currentStreak,
            longestStreak: userStat.longestStreak,
            calendar: calendarEntries,
        };
    }
}
