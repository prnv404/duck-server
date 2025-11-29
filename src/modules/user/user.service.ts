// src/modules/user/user.service.ts
import { Inject, Injectable } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import {
    NewUser,
    User,
    users,
    UserStats,
    userStats,
    userQuizPreferences,
    type NewUserQuizPreference,
    StreakCalendar,
    streakCalendar,
} from '@/database/schema';
import { eq, or } from 'drizzle-orm';
import { ServiceHelper } from '@/common/utils';

type DrizzleDB = DatabaseModule.DrizzleDB;

@Injectable()
export class UserService {
    constructor(@Inject(DatabaseModule.DRIZZLE) private readonly db: DrizzleDB) {}

    // ──────────────────────────────────────────────────────────────────────
    // NEW: One-stop method for AuthService — creates user + all defaults
    // ──────────────────────────────────────────────────────────────────────
    async createNewUser(data: { phone: string; username?: string }): Promise<User> {
        const { phone, username } = data;

        // Optional: allow custom username, otherwise generate
        const finalUsername = username || `user_${phone.slice(-4)}_${Math.floor(Math.random() * 9999)}`;

        return this.db.transaction(async (tx) => {
            // 1. Check uniqueness
            const existing = await tx.query.users.findFirst({
                where: eq(users.phone, phone),
            });

            ServiceHelper.ensureUnique(!!existing, 'Phone or username already taken');

            // 2. Create main user
            const [user] = await tx
                .insert(users)
                .values({
                    phone,
                    username: finalUsername,
                    notificationEnabled: true,
                })
                .returning();

            if (!user) throw new Error('Failed to create user');

            // 3. Create user_stats (one-to-one)
            await tx.insert(userStats).values({
                userId: user.id,
                totalXp: 0,
                level: 1,
                xpToNextLevel: 100,
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: null,
                totalQuizzesCompleted: 0,
                totalQuestionsAttempted: 0,
                totalCorrectAnswers: 0,
                overallAccuracy: '0.00',
                totalPracticeTimeMinutes: 0,
            });

            // 4. Create user_quiz_preferences (one-to-one)
            await tx.insert(userQuizPreferences).values({
                userId: user.id,
                defaultBalanceStrategy: 'balanced',
                difficultyAdaptationEnabled: true,
                excludedSubjectIds: [],
                preferredSubjectIds: [],
                avoidRecentQuestionsDays: 7,
                allowQuestionRepetition: false,
                defaultQuestionsPerSession: 10,
                weakAreaThreshold: '70.00',
                minQuestionsForWeakDetection: 10,
            });

            // Optional: You can add welcome badge, starter XP, etc. here later

            return user;
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Existing methods (unchanged or slightly cleaned)
    // ──────────────────────────────────────────────────────────────────────
    async createUser(data: NewUser): Promise<User> {
        const existingUser = await this.db.query.users.findFirst({
            where: or(eq(users.phone, data.phone), eq(users.username, data.username)),
        });

        ServiceHelper.ensureUnique(!!existingUser, 'User already exists.');

        const [user] = await this.db.insert(users).values(data).returning();
        await this.db.insert(userStats).values({ userId: user.id });
        return user;
    }

    async getUser(id: string): Promise<User> {
        const user = await this.db.query.users.findFirst({
            where: eq(users.id, id),
        });

        return ServiceHelper.ensureExists(user, id, 'User');
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const { id: _, ...updateData } = data;

        const [updatedUser] = await this.db.update(users).set(updateData).where(eq(users.id, id)).returning();

        return ServiceHelper.ensureExists(updatedUser, id, 'User');
    }

    async findByPhone(phone: string): Promise<User | undefined> {
        const [user] = await this.db.select().from(users).where(eq(users.phone, phone));
        return user;
    }

    async findAll(limit = 20, offset = 0): Promise<User[]> {
        return this.db.select().from(users).limit(limit).offset(offset);
    }

    async deleteUser(id: string): Promise<User> {
        const [deletedUser] = await this.db.delete(users).where(eq(users.id, id)).returning();

        return ServiceHelper.ensureExists(deletedUser, id, 'User');
    }

    async getUserStats(id: string): Promise<UserStats> {
        await this.getUser(id); // ensure user exists

        const stats = await this.db.query.userStats.findFirst({
            where: eq(userStats.userId, id),
        });

        return ServiceHelper.ensureExists(stats, id, 'UserStats');
    }

    async updateUserStats(id: string, data: Partial<UserStats>): Promise<UserStats> {
        const { id: _, ...updateData } = data;

        const [updated] = await this.db.update(userStats).set(updateData).where(eq(userStats.userId, id)).returning();

        return ServiceHelper.ensureExists(updated, id, 'UserStats');
    }

    async getStreakCalendar(id: string): Promise<StreakCalendar[]> {
        await this.getUser(id); // ensure user exists

        const calendar = await this.db.query.streakCalendar.findMany({
            where: eq(streakCalendar.userId, id),
        });

        return ServiceHelper.ensureExists(calendar, id, 'StreakCalendar');
    }
}
