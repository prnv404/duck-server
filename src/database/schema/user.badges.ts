import { pgTable, uuid, timestamp, text, decimal, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Assuming you have imported your users and badges schemas correctly
import { user } from './users';
import { badges } from './badges';
import { relations } from 'drizzle-orm';

export const userBadges = pgTable(
    'user_badges',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key to users table
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),

        // Foreign Key to badges table
        badgeId: uuid('badge_id')
            .notNull()
            .references(() => badges.id, { onDelete: 'cascade' }),

        unlockedAt: timestamp('unlocked_at', { mode: 'date' }).defaultNow(), // NOTE: This is set by default, but should be null until unlocked if progress is tracked

        progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 })
            .default('0.00') // Drizzle uses string for decimal defaults
            .notNull(),

        // The timestamp when the record was created (can be useful for tracking when a user started progressing toward a badge)
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Unique Constraint: Ensures a user can only have one entry for any specific badge.
        unique('user_badge_unique').on(table.userId, table.badgeId),

        // Index: Optimized for fetching all badges earned by a user, sorted by the most recently unlocked.
        index('idx_user_badges').on(
            table.userId,
            sql`unlocked_at DESC`, // Using raw SQL for DESC here is another valid alternative if pgSort import causes issues.
        ),
    ],
);

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
    user: one(user, {
        fields: [userBadges.userId],
        references: [user.id],
    }),
    badge: one(badges, {
        fields: [userBadges.badgeId],
        references: [badges.id],
    }),
}));
