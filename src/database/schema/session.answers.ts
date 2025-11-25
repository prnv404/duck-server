import { pgTable, uuid, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { quizSessions } from './quiz.session'; // Import quizSessions schema
import { questions } from './questions'; // Import questions schema
import { answerOptions } from './answer.options'; // Import answerOptions schema
import { relations } from 'drizzle-orm';

export const sessionAnswers = pgTable(
    'session_answers',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key to quiz_sessions table (CASCADE delete)
        sessionId: uuid('session_id')
            .notNull()
            .references(() => quizSessions.id, { onDelete: 'cascade' }),

        // Foreign Key to questions table (SET NULL delete is assumed for safety if not specified)
        questionId: uuid('question_id')
            .notNull() // Assuming a session answer must always relate to a question
            .references(() => questions.id, { onDelete: 'set null' }),

        // Foreign Key to the selected answer_options (NULLable if user skipped/ran out of time)
        selectedOptionId: uuid('selected_option_id').references(() => answerOptions.id, { onDelete: 'set null' }),

        isCorrect: boolean('is_correct').notNull(),

        timeSpentSeconds: integer('time_spent_seconds'),

        answeredAt: timestamp('answered_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Index: Optimized for fetching all answers belonging to a single session.
        index('idx_session_answers').on(table.sessionId),
    ],
);

export const sessionAnswersRelations = relations(sessionAnswers, ({ one }) => ({
    // The answer belongs to ONE session
    session: one(quizSessions, {
        fields: [sessionAnswers.sessionId],
        references: [quizSessions.id],
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
