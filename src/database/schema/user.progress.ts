import { pgTable, uuid, integer, decimal, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { topics } from './topics';
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
            .$onUpdateFn(() => new Date()),
    },
    (table) => [
        unique('user_topic_unique').on(table.userId, table.topicId),
        index('idx_topic_progress_user').on(table.userId, table.accuracy),
    ],
);

export type UserTopicProgress = typeof userTopicProgress.$inferSelect;
export type NewUserTopicProgress = typeof userTopicProgress.$inferInsert;

export const userTopicProgressRelations = relations(userTopicProgress, ({ one }) => ({
    user: one(users, {
        fields: [userTopicProgress.userId],
        references: [users.id],
    }),
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
