import { pgTable, uuid, varchar, text, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { questions } from './questions';
import { userTopicProgress } from './user.progress';
import { practiceSessions } from './practice.session';

export const subjects = pgTable(
    'subjects',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        name: varchar('name', { length: 100 }).notNull(),

        iconUrl: text('icon_url'),

        colorCode: varchar('color_code', { length: 7 }),

        displayOrder: integer('display_order'),

        weightage: integer('weightage'),

        is_active_in_random: boolean('is_active_in_random').default(true),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Index to quickly sort subjects by their display order
        index('idx_subjects_order').on(table.displayOrder),
    ],
);

export const topics = pgTable(
    'topics',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key Reference
        subjectId: uuid('subject_id')
            .notNull()
            .references(() => subjects.id, { onDelete: 'cascade' }),

        name: varchar('name', { length: 255 }).notNull(),

        description: text('description'),

        displayOrder: integer('display_order'),

        is_active_in_random: boolean('is_active_in_random').default(true),

        weightage: integer('weightage'),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // Index: Optimized for fetching all topics for a specific subject, sorted by their display order.
        index('idx_topics_subject').on(table.subjectId, table.displayOrder),
    ],
);

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
    topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
    subject: one(subjects, {
        fields: [topics.subjectId],
        references: [subjects.id],
    }),
    questions: many(questions),
    practiceSessions: many(practiceSessions),
    userTopicProgress: many(userTopicProgress),
}));
