import { pgTable, uuid, date, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users'; // Assuming 'users' table is defined in './users'
import { relations } from 'drizzle-orm';

export const streakCalendar = pgTable(
    'streak_calendar',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key Reference
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),

        activityDate: date('activity_date', { mode: 'date' }).notNull(),

        // Activity Metrics
        quizzesCompleted: integer('quizzes_completed').default(0).notNull(),
        questionsAnswered: integer('questions_answered').default(0).notNull(),
        xpEarned: integer('xp_earned').default(0).notNull(),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Unique Constraint
        // Ensures a user can only have one entry per day
        unique('user_date_unique').on(table.userId, table.activityDate),

        // Index
        // Optimized for fetching streak data for a specific user
        index('idx_streak_user_date').on(table.userId, table.activityDate),
    ],
);

export type StreakCalendar = typeof streakCalendar.$inferSelect;
export type NewStreakCalendar = typeof streakCalendar.$inferInsert;

export const streakCalendarRelations = relations(streakCalendar, ({ one }) => ({
    user: one(users, {
        fields: [streakCalendar.userId],
        references: [users.id],
    }),
}));
