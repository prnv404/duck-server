import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';     // Import users schema
import { questions } from './questions'; // Import questions schema
import { relations } from 'drizzle-orm';

export const userQuestionHistory = pgTable(
  'user_question_history',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Foreign Keys
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
      
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
      
    lastSeenAt: timestamp('last_seen_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
      
    timesSeen: integer('times_seen')
      .default(1)
      .notNull(),
      
    timesCorrect: integer('times_correct')
      .default(0)
      .notNull(),
  },
  (table) => [
    // Unique Constraint: Ensures only one history record exists for a given user and question.
    unique('user_question_unique').on(table.userId, table.questionId),

    // Index: Optimized for fetching a user's question history, sorted by most recently seen.
    index('idx_question_history_user').on(
      table.userId,
    ),
  ]
);

export type UserQuestionHistory = typeof userQuestionHistory.$inferSelect;
export type NewUserQuestionHistory = typeof userQuestionHistory.$inferInsert;


export const userQuestionHistoryRelations = relations(userQuestionHistory, ({ one }) => ({
  // The history entry belongs to ONE user
  user: one(users, {
    fields: [userQuestionHistory.userId],
    references: [users.id],
  }),
  // The history entry tracks ONE question
  question: one(questions, {
    fields: [userQuestionHistory.questionId],
    references: [questions.id],
  }),
}));