import { pgTable, uuid, integer, decimal, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users'; // Import users schema
import { topics } from './topics'; // Import topics schema
import { relations } from 'drizzle-orm';

export const userTopicProgress = pgTable(
    'user_topic_progress',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Keys
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),

        topicId: uuid('topic_id')
            .notNull()
            .references(() => topics.id, { onDelete: 'cascade' }),

        // Progress Stats
        questionsAttempted: integer('questions_attempted').default(0).notNull(),

        correctAnswers: integer('correct_answers').default(0).notNull(),

        accuracy: decimal('accuracy', { precision: 5, scale: 2 }).default('0.00').notNull(),

        lastPracticedAt: timestamp('last_practiced_at', { mode: 'date' }),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),

        updatedAt: timestamp('updated_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()), // Automatically updates the timestamp on every row update
    },
    (table) => [
        // Unique Constraint: Ensures a user only has one progress record per topic.
        unique('user_topic_unique').on(table.userId, table.topicId),

        // Index: Optimized for finding all topics practiced by a user, sorted by accuracy (ASC).
        // ASC order is useful for finding the user's weakest topics quickly.
        index('idx_topic_progress_user').on(table.userId, table.accuracy),
    ],
);

export type UserTopicProgress = typeof userTopicProgress.$inferSelect;
export type NewUserTopicProgress = typeof userTopicProgress.$inferInsert;

export const userTopicProgressRelations = relations(userTopicProgress, ({ one }) => ({
    // The progress entry belongs to ONE user
    user: one(users, {
        fields: [userTopicProgress.userId],
        references: [users.id],
    }),
    // The progress entry tracks ONE topic
    topic: one(topics, {
        fields: [userTopicProgress.topicId],
        references: [topics.id],
    }),
}));

/**
 * -- Analytics: Weak areas (topics with low accuracy)
CREATE MATERIALIZED VIEW weak_topics AS
SELECT 
  user_id,
  topic_id,
  accuracy,
  questions_attempted
FROM user_topic_progress
WHERE questions_attempted >= 10 -- minimum threshold
  AND accuracy < 70.00 -- below 70% is weak
ORDER BY user_id, accuracy ASC;

CREATE INDEX idx_weak_topics_user ON weak_topics(user_id);

-- Refresh periodically (daily cron job)
REFRESH MATERIALIZED VIEW weak_topics;

 */
