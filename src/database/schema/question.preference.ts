import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users'; // Import users schema
import { relations } from 'drizzle-orm';

export const userQuizPreferences = pgTable(
  'user_quiz_preferences',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Foreign Key (One-to-One Relationship)
    userId: uuid('user_id')
      .unique() // Enforces the UNIQUE constraint
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Balance Strategy
    balanceStrategy: varchar('balance_strategy', { length: 50 })
      .default('balanced')
      .notNull(),
      
    // Difficulty Preference
    preferredDifficulty: integer('preferred_difficulty'), // Nullable (for adaptive mode)
      
    // Subject Preferences (PostgreSQL Array Type)
    excludedSubjectIds: uuid('excluded_subject_ids').array(),
    preferredSubjectIds: uuid('preferred_subject_ids').array(),
    
    // Repetition Settings
    avoidRecentQuestionsDays: integer('avoid_recent_questions_days')
      .default(7)
      .notNull(),

    createdAt: timestamp('created_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
      
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()), // Automatically updates the timestamp
  }
);

export type UserQuizPreference = typeof userQuizPreferences.$inferSelect;
export type NewUserQuizPreference = typeof userQuizPreferences.$inferInsert;


export const userQuizPreferencesRelations = relations(userQuizPreferences, ({ one }) => ({
  // The preference entry belongs to ONE user
  user: one(users, {
    fields: [userQuizPreferences.userId],
    references: [users.id],
  }),
}));