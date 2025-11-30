import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { topics } from './curriculum'; // Assuming topics is imported from './topics'
import { relations } from 'drizzle-orm';
import { answerOptions } from './answer.options';
import { sessionAnswers } from './session.answers';
import { userQuestionHistory } from './question.history';
import { serial } from 'drizzle-orm/pg-core';
import { json } from 'drizzle-orm/pg-core';

export const questions = pgTable(
    'questions',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        qNo: serial('qNo').notNull(),
        // Foreign Key Reference to topics table
        topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }), // Using SET NULL since no ON DELETE was specified in SQL

        questionText: text('question_text').notNull(),

        audioUrl: text('audio_url'),

        explanation: text('explanation'),

        difficulty: integer('difficulty') // 1-5
            .default(1)
            .notNull(),

        points: integer('points').default(1).notNull(),

        upvotes: integer('upvotes').default(0).notNull(),

        downvotes: integer('downvotes').default(0).notNull(),


        // Analytics
        timesAttempted: integer('times_attempted').default(0).notNull(),

        timesCorrect: integer('times_correct').default(0).notNull(),

        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Index 1: Optimize for fetching questions by topic
        index('idx_questions_topic').on(table.topicId),

        // Index 2: Optimize for fetching questions by difficulty level
        index('idx_questions_difficulty').on(table.difficulty),
    ],
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export const questionsRelations = relations(questions, ({ one, many }) => ({
    topic: one(topics, {
        fields: [questions.topicId],
        references: [topics.id],
    }),
    answerOptions: many(answerOptions),
    sessionAnswers: many(sessionAnswers),
    userQuestionHistory: many(userQuestionHistory),
}));
