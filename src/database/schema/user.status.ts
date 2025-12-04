import { pgTable, uuid, integer, text, date, decimal, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './users';
import { relations } from 'drizzle-orm';

export const userStats = pgTable(
    'user_stats',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        userId: text('user_id')
            .unique()
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),

        // XP & Levels
        totalXp: integer('total_xp').default(0).notNull(),
        level: integer('level').default(1).notNull(),
        xpToNextLevel: integer('xp_to_next_level').default(100).notNull(),
        energy: integer('energy').default(0).notNull(),

        // Streaks
        currentStreak: integer('current_streak').default(0).notNull(),
        longestStreak: integer('longest_streak').default(0).notNull(),
        lastActivityDate: date('last_activity_date', { mode: 'date' }),

        // Quiz Stats
        totalQuizzesCompleted: integer('total_quizzes_completed').default(0).notNull(),
        totalQuestionsAttempted: integer('total_questions_attempted').default(0).notNull(),
        totalCorrectAnswers: integer('total_correct_answers').default(0).notNull(),
        overallAccuracy: decimal('overall_accuracy', { precision: 5, scale: 2 })
            .default('0.00') // Drizzle uses string for decimal defaults
            .notNull(),

        // Time tracking
        totalPracticeTimeMinutes: integer('total_practice_time_minutes').default(0).notNull(),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdate(() => new Date()),
    },
    (table) => [index('idx_user_stats_xp').on(table.totalXp), index('idx_user_stats_level').on(table.level)],
);

export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;

export const userStatsRelations = relations(userStats, ({ one }) => ({
    // A userStats entry belongs to ONE user (one-to-one relationship)
    user: one(user, {
        fields: [userStats.userId], // The foreign key column in userStats
        references: [user.id], // The primary key column in users
    }),
}));
