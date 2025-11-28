import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { practiceSessions } from './practice.session';
import { userStats } from './user.status';
import { streakCalendar } from './streak.calender';
import { userBadges } from './user.badges';
import { userTopicProgress } from './user.progress';
import { leaderboardEntries } from './leaderboard';
import { userQuestionHistory } from './question.history';
import { userQuizPreferences } from './question.preference';
import { notificationQueue } from './notification';

export const users = pgTable(
    'users',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        username: varchar('username', { length: 100 }).unique().notNull(),
        phone: varchar('phone', { length: 255 }).unique().notNull(),
        fullName: varchar('full_name', { length: 255 }),
        avatarUrl: text('avatar_url'),
        targetExam: varchar('target_exam', { length: 50 }),
        fcmToken: text('fcm_token'),
        notificationEnabled: boolean('notification_enabled').default(true).notNull(),
        refreshToken: text('refresh_token'),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        lastActiveAt: timestamp('last_active_at', { mode: 'date' }),
    },
    (table) => [index('idx_users_phone').on(table.phone), index('idx_users_username').on(table.username)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const usersRelations = relations(users, ({ one, many }) => ({
    userStats: one(userStats),
    streakCalendar: many(streakCalendar),
    userBadges: many(userBadges),
    practiceSessions: many(practiceSessions),
    userTopicProgress: many(userTopicProgress),
    leaderboardEntries: many(leaderboardEntries),
    userQuestionHistory: many(userQuestionHistory),
    userQuizPreferences: one(userQuizPreferences),
    notificationQueue: many(notificationQueue),
}));
