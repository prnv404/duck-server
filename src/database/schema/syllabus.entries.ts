import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { boards } from './boards';
import { topics } from './curriculum';
import { relations } from 'drizzle-orm';
import { varchar } from 'drizzle-orm/pg-core';

export const syllabusEntries = pgTable(
    'syllabus_entries',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }),
        level: varchar('level', { length: 20 }).notNull(), // Matches userEnrollments.level
        topicId: uuid('topic_id')
            .notNull()
            .references(() => topics.id, { onDelete: 'cascade' }), // Eligible topic for this board-level
        // Optional: weightageOverride (int) to adjust topic weight in quizzes for this board
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Unique: One entry per board-level-topic
        unique('board_level_topic_unique').on(table.boardId, table.level, table.topicId),
        // Index for quiz gen: Fast lookup of topics for a board-level
        index('idx_syllabus_board_level').on(table.boardId, table.level),
        index('idx_syllabus_topic').on(table.topicId),
    ],
);

export type SyllabusEntry = typeof syllabusEntries.$inferSelect;
export type NewSyllabusEntry = typeof syllabusEntries.$inferInsert;

export const syllabusEntriesRelations = relations(syllabusEntries, ({ one, many }) => ({
    board: one(boards, {
        fields: [syllabusEntries.boardId],
        references: [boards.id],
    }),
    topic: one(topics, {
        fields: [syllabusEntries.topicId],
        references: [topics.id],
    }),
}));
