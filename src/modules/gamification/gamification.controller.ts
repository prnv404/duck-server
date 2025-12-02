import { Controller, Get, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { BadgeResponseDto, StreakDataDto, LeaderboardEntryDto } from './dto/gamification.dto';
import { JwtRestAuthGuard } from '@/common/guards/jwt-rest.guard';
import { Inject } from '@nestjs/common';
import * as Database from '@/database';
import { userBadges, badges, leaderboardEntries, users } from '@/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthenticatedRequest } from '@/common/types/request.types';

@Controller('gamification')
@UseGuards(JwtRestAuthGuard)
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
    async getMyBadges(@Req() req: AuthenticatedRequest): Promise<BadgeResponseDto[]> {
        const userBadgesList = await this.db
            .select({
                badge: badges,
                userBadge: userBadges,
            })
            .from(userBadges)
            .innerJoin(badges, eq(userBadges.badgeId, badges.id))
            .where(eq(userBadges.userId, req.user.id));

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
    async getAllBadges(@Req() req: AuthenticatedRequest): Promise<BadgeResponseDto[]> {
        const allBadges = await this.db.select().from(badges);
        const unlockedBadgeIds = (
            await this.db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, req.user.id))
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
    async getMyStreak(@Req() req: AuthenticatedRequest): Promise<StreakDataDto> {
        const streakData = await this.gamificationService.getStreakCalendar(req.user.id);
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
    @HttpCode(HttpStatus.OK)
    async getLeaderboard(
        @Query('period') period: string = 'weekly',
        @Query('limit') limit: string = '50',
    ): Promise<LeaderboardEntryDto[]> {
        const limitNum = Math.min(parseInt(limit) || 50, 100);

        const leaderboard = await this.db
            .select({
                userId: leaderboardEntries.userId,
                username: users.username,
                fullName: users.fullName,
                avatarUrl: users.avatarUrl,
                xpEarned: leaderboardEntries.xpEarned,
                quizzesCompleted: leaderboardEntries.quizzesCompleted,
                rank: leaderboardEntries.rank,
            })
            .from(leaderboardEntries)
            .innerJoin(users, eq(leaderboardEntries.userId, users.id))
            .where(eq(leaderboardEntries.periodType, period))
            .orderBy(desc(leaderboardEntries.xpEarned))
            .limit(limitNum);

        return leaderboard.map((entry) => ({
            userId: entry.userId,
            username: entry.username,
            fullName: entry.fullName,
            avatarUrl: entry.avatarUrl,
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
    async getMyRank(@Req() req: AuthenticatedRequest, @Query('period') period: string = 'weekly'): Promise<LeaderboardEntryDto | null> {
        const [entry] = await this.db
            .select({
                userId: leaderboardEntries.userId,
                username: users.username,
                fullName: users.fullName,
                avatarUrl: users.avatarUrl,
                xpEarned: leaderboardEntries.xpEarned,
                quizzesCompleted: leaderboardEntries.quizzesCompleted,
                rank: leaderboardEntries.rank,
            })
            .from(leaderboardEntries)
            .innerJoin(users, eq(leaderboardEntries.userId, users.id))
            .where(and(eq(leaderboardEntries.userId, req.user.id), eq(leaderboardEntries.periodType, period)))
            .limit(1);

        if (!entry) return null;

        return {
            userId: entry.userId,
            username: entry.username,
            fullName: entry.fullName,
            avatarUrl: entry.avatarUrl,
            xpEarned: entry.xpEarned,
            quizzesCompleted: entry.quizzesCompleted,
            rank: entry.rank,
        };
    }
}
