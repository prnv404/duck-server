import { pgTable, uuid, varchar, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users'; // Import users schema
import { topics } from './topics'; // Import topics schema
import { relations } from 'drizzle-orm';
import { sessionAnswers } from './session.answers';
import { jsonb } from 'drizzle-orm/pg-core';

export const practiceSessions = pgTable(
    'practice_sessions',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key to users table
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),

        // Session Type
        sessionType: varchar('session_type', { length: 50 }).default('random').notNull(),

        // Optional Foreign Key to topics table
        topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),

        // Configuration
        totalQuestions: integer('total_questions').default(10).notNull(),

        // Results
        questionsAttempted: integer('questions_attempted').default(0).notNull(),

        correctAnswers: integer('correct_answers').default(0).notNull(),

        wrongAnswers: integer('wrong_answers').default(0).notNull(),

        accuracy: decimal('accuracy', { precision: 5, scale: 2 }).default('0.00').notNull(),

        // Rewards
        xpEarned: integer('xp_earned').default(0).notNull(),

        // Timing
        startedAt: timestamp('started_at', { mode: 'date' }).defaultNow().notNull(),

        completedAt: timestamp('completed_at', { mode: 'date' }),

        timeSpentSeconds: integer('time_spent_seconds'),

        balanceStrategy: varchar('balance_strategy', { length: 50 }).default('balanced').notNull(),

        subjectDistribution: jsonb('subject_distribution').notNull(),

        topicDistribution: jsonb('topic_distribution').notNull(),

        // Status
        status: varchar('status', { length: 20 }).default('in_progress').notNull(), // 'in_progress', 'completed', 'abandoned'

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Index 1: Optimized for fetching a user's sessions by date (most recent first)
        index('idx_sessions_user').on(table.userId, sql`created_at DESC`),

        // Index 2: Optimized for quickly finding a user's currently active sessions
        index('idx_sessions_status').on(table.userId, table.status),
    ],
);

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;

export const practiceSessionsRelations = relations(practiceSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [practiceSessions.userId],
        references: [users.id],
    }),
    topic: one(topics, {
        fields: [practiceSessions.topicId],
        references: [topics.id],
    }),
    sessionAnswers: many(sessionAnswers),
}));

export enum SessionStatus {
    DRAFT = 'draft', // Session created, questions generated
    IN_PROGRESS = 'in_progress', // User started answering
    PAUSED = 'paused', // User left mid-quiz (optional)
    COMPLETED = 'completed', // All questions answered
    ABANDONED = 'abandoned', // User didn't complete
}
