import { Controller, Get, Query, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { BadgeResponseDto, StreakDataDto, LeaderboardEntryDto } from './dto/gamification.dto';
import * as Database from '@/database';
import { userBadges, badges, leaderboardEntries, user } from '@/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Session, type UserSession, AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('gamification')
export class GamificationController {
    constructor(
        private readonly gamificationService: GamificationService,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) { }

    /**
     * Get user's badges
     * GET /api/v1/gamification/my-badges
     */
    @Get('my-badges')
    @HttpCode(HttpStatus.OK)
    async getMyBadges(@Session() session: UserSession): Promise<BadgeResponseDto[]> {
        const userBadgesList = await this.db
            .select({
                badge: badges,
                userBadge: userBadges,
            })
            .from(userBadges)
            .innerJoin(badges, eq(userBadges.badgeId, badges.id))
            .where(eq(userBadges.userId, session.user.id));

        return userBadgesList.map((item) => ({
            id: item.badge.id,
            name: item.badge.name,
            description: item.badge.description,
            iconUrl: item.badge.iconUrl,
            badgeType: item.badge.badgeType,
            unlockCriteria: item.badge.unlockCriteria,
            xpReward: item.badge.xpReward,
            createdAt: item.badge.createdAt,
            unlockedAt: item.userBadge.unlockedAt,
            progressPercentage: item.userBadge.progressPercentage,
        }));
    }

    /**
     * Get all available badges (catalog)
     * GET /api/v1/gamification/badges
     */
    @Get('badges')
    @HttpCode(HttpStatus.OK)
    async getAllBadges(@Session() session: UserSession): Promise<BadgeResponseDto[]> {
        const allBadges = await this.db.select().from(badges);
        const unlockedBadgeIds = (
            await this.db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, session.user.id))
        ).map((b) => b.badgeId);

        return allBadges.map((badge) => ({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            iconUrl: badge.iconUrl,
            badgeType: badge.badgeType,
            unlockCriteria: badge.unlockCriteria,
            xpReward: badge.xpReward,
            createdAt: badge.createdAt,
            unlockedAt: unlockedBadgeIds.includes(badge.id) ? new Date() : null,
        }));
    }

    /**
     * Get user's streak calendar
     * GET /api/v1/gamification/my-streak
     */
    @Get('my-streak')
    @HttpCode(HttpStatus.OK)
    async getMyStreak(@Session() session: UserSession): Promise<StreakDataDto> {
        const streakData = await this.gamificationService.getStreakCalendar(session.user.id);
        return {
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            calendar: streakData.calendar.map((entry) => ({
                id: entry.id,
                userId: entry.userId,
                activityDate: entry.activityDate,
                quizzesCompleted: entry.quizzesCompleted,
                questionsAnswered: entry.questionsAnswered,
                xpEarned: entry.xpEarned,
                createdAt: entry.createdAt,
            })),
        };
    }

    /**
     * Get leaderboard by period
     * GET /api/v1/gamification/leaderboard?period=weekly&limit=50
     */
    @Get('leaderboard')
    @AllowAnonymous()
    @HttpCode(HttpStatus.OK)
    async getLeaderboard(
        @Query('period') period: string = 'weekly',
        @Query('limit') limit: string = '50',
    ): Promise<LeaderboardEntryDto[]> {
        const limitNum = Math.min(parseInt(limit) || 50, 100);

        const leaderboard = await this.db
            .select({
                userId: leaderboardEntries.userId,
                xpEarned: leaderboardEntries.xpEarned,
                quizzesCompleted: leaderboardEntries.quizzesCompleted,
                rank: leaderboardEntries.rank,
            })
            .from(leaderboardEntries)
            .innerJoin(user, eq(leaderboardEntries.userId, user.id))
            .where(eq(leaderboardEntries.periodType, period))
            .orderBy(desc(leaderboardEntries.xpEarned))
            .limit(limitNum);

        return leaderboard.map((entry) => ({
            userId: entry.userId,
            xpEarned: entry.xpEarned,
            quizzesCompleted: entry.quizzesCompleted,
            rank: entry.rank,
        }));
    }

    /**
     * Get user's rank in leaderboard
     * GET /api/v1/gamification/my-rank?period=weekly
     */
    @Get('my-rank')
    @HttpCode(HttpStatus.OK)
    async getMyRank(
        @Session() session: UserSession,
        @Query('period') period: string = 'weekly',
    ): Promise<LeaderboardEntryDto | null> {
        const [entry] = await this.db
            .select({
                userId: leaderboardEntries.userId,
                xpEarned: leaderboardEntries.xpEarned,
                quizzesCompleted: leaderboardEntries.quizzesCompleted,
                rank: leaderboardEntries.rank,
            })
            .from(leaderboardEntries)
            .innerJoin(user, eq(leaderboardEntries.userId, user.id))
            .where(and(eq(leaderboardEntries.userId, session.user.id), eq(leaderboardEntries.periodType, period)))
            .limit(1);

        if (!entry) return null;

        return {
            userId: entry.userId,
            xpEarned: entry.xpEarned,
            quizzesCompleted: entry.quizzesCompleted,
            rank: entry.rank,
        };
    }
}
