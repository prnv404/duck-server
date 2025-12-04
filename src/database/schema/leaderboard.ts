import { pgTable, uuid, varchar, date, text,integer, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './users'; // Import users schema
import { relations } from 'drizzle-orm';

export const leaderboardEntries = pgTable(
    'leaderboard_entries',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),

        // Period Details
        periodType: varchar('period_type', { length: 20 }).notNull(), // 'weekly', 'monthly', 'all_time'

        periodStart: date('period_start', { mode: 'date' }).notNull(),

        periodEnd: date('period_end', { mode: 'date' }),

        // Stats
        xpEarned: integer('xp_earned').default(0).notNull(),

        quizzesCompleted: integer('quizzes_completed').default(0).notNull(),

        rank: integer('rank'), // Nullable, as rank is often calculated/updated periodically

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),

        updatedAt: timestamp('updated_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        // Unique Constraint: Ensures only one entry per user for a specific period (e.g., John can only have one Weekly entry starting 2025-11-24).
        unique('user_period_unique').on(table.userId, table.periodType, table.periodStart),

        // Index 1: Critical for Leaderboard Querying
        // Optimized for fetching the leaderboard for a specific period (e.g., 'weekly', 2025-11-24), sorted by XP earned DESC.
        index('idx_leaderboard_period').on(table.periodType, table.periodStart, table.xpEarned),

        // Index 2: Optimized for fetching all leaderboard history for a single user.
        index('idx_leaderboard_user').on(table.userId, table.periodType),
    ],
);

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboardEntries.$inferInsert;

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
    // The entry belongs to ONE user
    user: one(user, {
        fields: [leaderboardEntries.userId],
        references: [user.id],
    }),
}));
