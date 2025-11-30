import { pgTable, uuid, text, integer, timestamp, index, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { topics } from './curriculum';
import { questions } from './questions';

// Job status enum for BullMQ tracking
export const jobStatusEnum = pgEnum('job_status', [
    'pending',
    'generating',
    'pending_audio',
    'processing_audio',
    'completed',
    'failed',
]);

export const questionQueue = pgTable(
    'question_queue',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        question: json('question').notNull(),

        answer_option: json('answer_option').notNull(),

        is_approved: boolean('is_approved').default(false).notNull(),

        is_rejected: boolean('is_rejected').default(false).notNull(),

        topicId: uuid('topic_id')
            .notNull()
            .references(() => topics.id, { onDelete: 'cascade' }),

        // BullMQ job tracking fields
        jobId: text('job_id'),
        status: jobStatusEnum('status').default('pending'),
        errorMessage: text('error_message'),
        attemptCount: integer('attempt_count').default(0).notNull(),

        questionId: uuid('question_id').references(() => questions.id, { onDelete: 'set null' }),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('idx_question_queue_approved').on(table.is_approved),
        index('idx_question_queue_rejected').on(table.is_rejected),
        index('idx_question_queue_job_id').on(table.jobId),
        index('idx_question_queue_status').on(table.status),
    ],
);

export const questionQueueRelations = relations(questionQueue, ({ one, many }) => ({
    topic: one(topics, {
        fields: [questionQueue.topicId],
        references: [topics.id],
    }),
}));

export type QuestionQueue = typeof questionQueue.$inferSelect;
export type NewQuestionQueue = typeof questionQueue.$inferInsert;
