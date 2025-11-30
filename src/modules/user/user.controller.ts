import { Controller, Get, Patch, Delete, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import {
    UpdateUserDto,
    UpdateUserStatsDto,
    UserResponseDto,
    UserStatsResponseDto,
    StreakCalendarResponseDto,
} from './dto/rest-user.dto';
import { JwtRestAuthGuard } from '@/common/guards/jwt-rest.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
@UseGuards(JwtRestAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    /**
     * Get current user profile
     * GET /api/v1/users/me
     */
    @Get('me')
    @HttpCode(HttpStatus.OK)
    async getMe(@Req() req: any): Promise<UserResponseDto> {
        const user = await this.userService.getUser(req.user.id);
        return {
            id: user.id,
            username: user.username,
            phone: user.phone,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            targetExam: user.targetExam,
            fcmToken: user.fcmToken,
            notificationEnabled: user.notificationEnabled,
            createdAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
        };
    }

    /**
     * Update current user profile
     * PATCH /api/v1/users/me
     */
    @Patch('me')
    @HttpCode(HttpStatus.OK)
    async updateMe(@Req() req: any, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
        const user = await this.userService.updateUser(req.user.id, dto);
        return {
            id: user.id,
            username: user.username,
            phone: user.phone,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            targetExam: user.targetExam,
            fcmToken: user.fcmToken,
            notificationEnabled: user.notificationEnabled,
            createdAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
        };
    }

    /**
     * Delete current user account
     * DELETE /api/v1/users/me
     */
    @Delete('me')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
    async deleteMe(@Req() req: any): Promise<{ success: boolean; message: string }> {
        await this.userService.deleteUser(req.user.id);
        return {
            success: true,
            message: 'Account deleted successfully',
        };
    }

    /**
     * Get user statistics
     * GET /api/v1/users/me/stats
     */
    @Get('me/stats')
    @HttpCode(HttpStatus.OK)
    async getMyStats(@Req() req: any): Promise<UserStatsResponseDto> {
        const stats = await this.userService.getUserStats(req.user.id);
        return {
            id: stats.id,
            userId: stats.userId,
            totalXp: stats.totalXp,
            level: stats.level,
            energy: stats.energy,
            xpToNextLevel: stats.xpToNextLevel,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            lastActivityDate: stats.lastActivityDate,
            totalQuizzesCompleted: stats.totalQuizzesCompleted,
            totalQuestionsAttempted: stats.totalQuestionsAttempted,
            totalCorrectAnswers: stats.totalCorrectAnswers,
            overallAccuracy: stats.overallAccuracy,
            totalPracticeTimeMinutes: stats.totalPracticeTimeMinutes,
            createdAt: stats.createdAt,
            updatedAt: stats.updatedAt,
        };
    }

    /**
     * Update user statistics
     * PATCH /api/v1/users/me/stats
     */
    @Patch('me/stats')
    @HttpCode(HttpStatus.OK)
    async updateMyStats(@Req() req: any, @Body() dto: UpdateUserStatsDto): Promise<UserStatsResponseDto> {
        const stats = await this.userService.updateUserStats(req.user.id, dto);
        return {
            id: stats.id,
            userId: stats.userId,
            totalXp: stats.totalXp,
            level: stats.level,
            energy: stats.energy,
            xpToNextLevel: stats.xpToNextLevel,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            lastActivityDate: stats.lastActivityDate,
            totalQuizzesCompleted: stats.totalQuizzesCompleted,
            totalQuestionsAttempted: stats.totalQuestionsAttempted,
            totalCorrectAnswers: stats.totalCorrectAnswers,
            overallAccuracy: stats.overallAccuracy,
            totalPracticeTimeMinutes: stats.totalPracticeTimeMinutes,
            createdAt: stats.createdAt,
            updatedAt: stats.updatedAt,
        };
    }

    /**
     * Get streak calendar
     * GET /api/v1/users/me/streak
     */
    @Get('me/streak')
    @HttpCode(HttpStatus.OK)
    async getMyStreak(@Req() req: any): Promise<StreakCalendarResponseDto[]> {
        const streaks = await this.userService.getStreakCalendar(req.user.id);
        return streaks.map((streak) => ({
            id: streak.id,
            userId: streak.userId,
            date: streak.activityDate,
            quizzesCompleted: streak.quizzesCompleted,
            questionsAnswered: streak.questionsAnswered,
            xpEarned: streak.xpEarned,
            streakDay: 0, // This field doesn't exist in schema, so we set to 0 or calculate it
        }));
    }
}
