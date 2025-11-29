import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const boards = pgTable('boards', {
    id: uuid('id')
        .primaryKey()
        .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 100 }).notNull().unique(), // e.g., 'PSC', 'SSC', 'RRB'
    description: text('description'), // e.g., 'Public Service Commission Exams'
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

// Relations (minimal; expanded below)
import { relations } from 'drizzle-orm';
import { userEnrollments } from './user.enrollment';
import { syllabusEntries } from './syllabus.entries';
export const boardsRelations = relations(boards, ({ many }) => ({
    userEnrollments: many(userEnrollments), // Defined below
    syllabusEntries: many(syllabusEntries), // Defined below
}));
