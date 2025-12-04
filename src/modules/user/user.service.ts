// src/modules/user/user.service.ts
import { Inject, Injectable } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import {
    NewUser,
    User,
    user,
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
    constructor(@Inject(DatabaseModule.DRIZZLE) private readonly db: DrizzleDB) { }

    // ──────────────────────────────────────────────────────────────────────
    // NEW: One-stop method for AuthService — creates user + all defaults
    // ──────────────────────────────────────────────────────────────────────
    // async createNewUser(data: { email: string,name:string}): Promise<User> {
    //     const {  name ,email} = data;

    //     // Optional: allow custom username, otherwise generate

    //     return this.db.transaction(async (tx) => {
    //         // 1. Check uniqueness
    //         const existing = await tx.query.user.findFirst({
    //             where: eq(user.email, email),
    //         });

    //         ServiceHelper.ensureUnique(!!existing, 'Email already taken');

    //         // 2. Create main user
    //         const [_user] = await tx
    //             .insert(user)
    //             .values({
    //                 id: '',    
    //                 name:"",
    //                 email: data.email

    //             })
    //             .returning();

    //         if (!user) throw new Error('Failed to create user');

    //         // 3. Create user_stats (one-to-one)
    //         await tx.insert(userStats).values({
    //             userId: user.id,
    //             totalXp: 0,
    //             level: 1,
    //             xpToNextLevel: 100,
    //             currentStreak: 0,
    //             longestStreak: 0,
    //             lastActivityDate: null,
    //             totalQuizzesCompleted: 0,
    //             totalQuestionsAttempted: 0,
    //             totalCorrectAnswers: 0,
    //             overallAccuracy: '0.00',
    //             totalPracticeTimeMinutes: 0,
    //         });

    //         // 4. Create user_quiz_preferences (one-to-one)
    //         await tx.insert(userQuizPreferences).values({
    //             userId: user.id,
    //             defaultBalanceStrategy: 'balanced',
    //             difficultyAdaptationEnabled: true,
    //             excludedSubjectIds: [],
    //             preferredSubjectIds: [],
    //             avoidRecentQuestionsDays: 7,
    //             allowQuestionRepetition: false,
    //             defaultQuestionsPerSession: 10,
    //             weakAreaThreshold: '70.00',
    //             minQuestionsForWeakDetection: 10,
    //         });

    //         // Optional: You can add welcome badge, starter XP, etc. here later

    //         return user;
    //     });
    // }

    // ──────────────────────────────────────────────────────────────────────
    // Existing methods (unchanged or slightly cleaned)
    // ──────────────────────────────────────────────────────────────────────
    // async createUser(data: NewUser): Promise<User> {
    //     const existingUser = await this.db.query.users.findFirst({
    //         where: eq(users.email, data.email)
    //     });

    //     ServiceHelper.ensureUnique(!!existingUser, 'User already exists.');

    //     const [user] = await this.db.insert(users).values(data).returning();
    //     await this.db.insert(userStats).values({ userId: user.id });
    //     return user;
    // }

    async getUser(id: string): Promise<User> {
        const _user = await this.db.query.user.findFirst({
            where: eq(user.id, id),
        });

        return ServiceHelper.ensureExists(_user, id, 'User');
    }



    async findAll(limit = 20, offset = 0): Promise<User[]> {
        return this.db.select().from(user).limit(limit).offset(offset);
    }

    async deleteUser(id: string): Promise<User> {
        const [deletedUser] = await this.db.delete(user).where(eq(user.id, id)).returning();

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
