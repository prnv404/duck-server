import { pgTable, uuid, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { questions } from './questions';
import { relations } from 'drizzle-orm';

export const answerOptions = pgTable(
    'answer_options',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key Reference to questions table with CASCADE delete
        questionId: uuid('question_id')
            .notNull()
            .references(() => questions.id, { onDelete: 'cascade' }),

        optionText: text('option_text').notNull(),

        isCorrect: boolean('is_correct').default(false).notNull(),

        optionOrder: integer('option_order'),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Index: Optimized for fetching all options for a specific question, sorted by their display order.
        index('idx_options_question').on(table.questionId, table.optionOrder),
    ],
);

export type AnswerOption = typeof answerOptions.$inferSelect;
export type NewAnswerOption = typeof answerOptions.$inferInsert;

export const answerOptionsRelations = relations(answerOptions, ({ one }) => ({
    question: one(questions, {
        fields: [answerOptions.questionId],
        references: [questions.id],
    }),
}));
