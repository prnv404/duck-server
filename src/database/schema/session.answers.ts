import { pgTable, uuid, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { practiceSessions } from './practice.session';
import { questions } from './questions';
import { answerOptions } from './answer.options';
import { relations } from 'drizzle-orm';

export const sessionAnswers = pgTable(
    'session_answers',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        sessionId: uuid('session_id')
            .notNull()
            .references(() => practiceSessions.id, { onDelete: 'cascade' }),
        questionId: uuid('question_id')
            .notNull() // Assuming a session answer must always relate to a question
            .references(() => questions.id, { onDelete: 'set null' }),

        // Foreign Key to the selected answer_options (NULLable if user skipped/ran out of time)
        selectedOptionId: uuid('selected_option_id').references(() => answerOptions.id, { onDelete: 'set null' }),

        isCorrect: boolean('is_correct').notNull(),

        timeSpentSeconds: integer('time_spent_seconds'),

        answeredAt: timestamp('answered_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [index('idx_session_answers').on(table.sessionId)],
);

export const sessionAnswersRelations = relations(sessionAnswers, ({ one }) => ({
    // The answer belongs to ONE session
    session: one(practiceSessions, {
        fields: [sessionAnswers.sessionId],
        references: [practiceSessions.id],
    }),
    // The answer relates to ONE question
    question: one(questions, {
        fields: [sessionAnswers.questionId],
        references: [questions.id],
    }),
    // The answer points to the ONE selected option
    selectedOption: one(answerOptions, {
        fields: [sessionAnswers.selectedOptionId],
        references: [answerOptions.id],
    }),
}));

export type SessionAnswer = typeof sessionAnswers.$inferSelect;
export type NewSessionAnswer = typeof sessionAnswers.$inferInsert;
