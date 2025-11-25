import {
    pgTable,
    uuid,
    varchar,
    text,
    jsonb, // Import for JSONB type
    integer,
    timestamp,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { userBadges } from './user.badges';

export const badges = pgTable('badges', {
    id: uuid('id')
        .primaryKey()
        .default(sql`gen_random_uuid()`),

    name: varchar('name', { length: 255 }).notNull(),

    description: text('description'),

    iconUrl: text('icon_url'),

    badgeType: varchar('badge_type', { length: 50 }), // 'streak', 'accuracy', etc.

    // Unlock criteria (JSONB for dynamic, structured data)
    unlockCriteria: jsonb('unlock_criteria')
        .$type<{
            type: 'streak' | 'accuracy' | 'quiz_count' | 'speed' | 'subject_master';
            days?: number;
            percentage?: number;
            min_questions?: number;
            count?: number;
            subject?: string;
        }>()
        .notNull(),

    xpReward: integer('xp_reward').default(0).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;

export const badgesRelations = relations(badges, ({ many }) => ({
    userBadges: many(userBadges),
}));
