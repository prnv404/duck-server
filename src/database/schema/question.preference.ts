import { pgTable, uuid, varchar, integer, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { users } from './users'; // Import users schema

export const userQuizPreferences = pgTable('user_quiz_preferences', {
    id: uuid('id')
        .primaryKey()
        .default(sql`gen_random_uuid()`),

    // Foreign Key (One-to-One Relationship)
    userId: uuid('user_id')
        .unique() // Enforces the UNIQUE constraint
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Balance Strategy (Renamed from balanceStrategy)
    defaultBalanceStrategy: varchar('default_balance_strategy', { length: 50 }).default('balanced').notNull(),

    // Difficulty Preference
    preferredDifficulty: integer('preferred_difficulty'), // 1-5, null = adaptive
    difficultyAdaptationEnabled: boolean('difficulty_adaptation_enabled').default(true).notNull(),

    // Subject Filtering (PostgreSQL Array Type - retained)
    excludedSubjectIds: uuid('excluded_subject_ids')
        .array()
        .default(sql`'{}'`)
        .notNull(),
    preferredSubjectIds: uuid('preferred_subject_ids')
        .array()
        .default(sql`'{}'`)
        .notNull(), // empty = all subjects

    // Question Freshness
    avoidRecentQuestionsDays: integer('avoid_recent_questions_days').default(7).notNull(),
    allowQuestionRepetition: boolean('allow_question_repetition').default(false).notNull(),

    // Session Defaults
    defaultQuestionsPerSession: integer('default_questions_per_session').default(10).notNull(),
    defaultTimeLimitSeconds: integer('default_time_limit_seconds'), // null = no limit

    // Advanced
    weakAreaThreshold: decimal('weak_area_threshold', { precision: 5, scale: 2 }).default('70.00').notNull(), // below this = weak
    minQuestionsForWeakDetection: integer('min_questions_for_weak_detection').default(10).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { mode: 'date' })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()), // Automatically updates the timestamp
});

export type UserQuizPreference = typeof userQuizPreferences.$inferSelect;
export type NewUserQuizPreference = typeof userQuizPreferences.$inferInsert;

export const userQuizPreferencesRelations = relations(userQuizPreferences, ({ one }) => ({
    // The preference entry belongs to ONE user
    user: one(users, {
        fields: [userQuizPreferences.userId],
        references: [users.id],
    }),
}));

export enum QuestionPreferenceType {
    BALANCED = 'balanced',
    ADAPTIVE = 'adaptive',
    WEAK_AREA = 'weak_area',
    TOPIC_PRACTICE = 'topic_practice',
    DAILY_CHALLENGE = 'daily_challenge',
    SUBJECT_FOCUS = 'subject_focus',
}
