import { pgTable, uuid, varchar, text, timestamp, index, boolean, integer } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { topics } from './curriculum';

export const prompts = pgTable(
    'prompts',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        name: varchar('name', { length: 255 }).notNull(),

        language: varchar('language', { length: 10 }).notNull(), // 'ml', 'en', 'hi'

        prompt: text('prompt').notNull(),

        topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),

        count: integer('count').default(5).notNull(),

        difficulty: integer('difficulty').default(2).notNull(), // 1-5

        model: varchar('model', { length: 100 }).default('gemini-1.5-flash').notNull(),

        systemPrompt: text('system_prompt'),

        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),

        updatedAt: timestamp('updated_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('idx_prompts_language').on(table.language),
        index('idx_prompts_active').on(table.isActive),
        index('idx_prompts_topic').on(table.topicId),
    ],
);

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export const promptsRelations = relations(prompts, ({ one }) => ({
    topic: one(topics, {
        fields: [prompts.topicId],
        references: [topics.id],
    }),
}));
