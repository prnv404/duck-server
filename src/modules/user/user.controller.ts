import { Controller, Get, Patch, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import {
    UpdateUserDto,
    UpdateUserStatsDto,
    UserResponseDto,
    UserStatsResponseDto,
    StreakCalendarResponseDto,
} from './dto/rest-user.dto';
import { Throttle } from '@nestjs/throttler';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @HttpCode(HttpStatus.OK)
    async getMe(@Session() session: UserSession): Promise<UserResponseDto> {
        const user = await this.userService.getUser(session.user.id);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    /**
     * Update current user profile
     * PATCH /api/v1/users/me
     */
    // @Patch('me')
    // @HttpCode(HttpStatus.OK)
    // async updateMe(@Session() session: UserSession, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    //     const user = await this.userService.updateUser(session.user.id, dto);
    //     return {
    //         id: user.id,
    //         createdAt: user.createdAt,
    //     };
    // }

    /**
     * Delete current user account
     * DELETE /api/v1/users/me
     */
    @Delete('me')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
    async deleteMe(@Session() session: UserSession): Promise<{ success: boolean; message: string }> {
        await this.userService.deleteUser(session.user.id);
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
    async getMyStats(@Session() session: UserSession): Promise<UserStatsResponseDto> {
        const stats = await this.userService.getUserStats(session.user.id);
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
    async updateMyStats(@Session() session: UserSession, @Body() dto: UpdateUserStatsDto): Promise<UserStatsResponseDto> {
        const stats = await this.userService.updateUserStats(session.user.id, dto);
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
    async getMyStreak(@Session() session: UserSession): Promise<StreakCalendarResponseDto[]> {
        const streaks = await this.userService.getStreakCalendar(session.user.id);
        return streaks.map((streak) => {
            // Format date as YYYY-MM-DD to avoid timezone issues
            const date = streak.activityDate instanceof Date ? streak.activityDate : new Date(streak.activityDate) 
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` as unknown as any;

            return {
                id: streak.id,
                userId: streak.userId,
                date: formattedDate  ,
                quizzesCompleted: streak.quizzesCompleted,
                questionsAnswered: streak.questionsAnswered,
                xpEarned: streak.xpEarned,
                streakDay: 0, // This field doesn't exist in schema, so we set to 0 or calculate it
            };
        });
    }
}
