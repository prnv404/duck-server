import { pgTable, uuid, integer, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const levels = pgTable(
    'levels',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        levelNumber: integer('level_number')
            .unique() // Enforces the UNIQUE constraint from SQL
            .notNull(),

        name: varchar('name', { length: 100 }), // VARCHAR(100)

        minXp: integer('min_xp').notNull(),

        maxXp: integer('max_xp').notNull(),

        iconUrl: text('icon_url'), // TEXT

        colorCode: varchar('color_code', { length: 7 }), // VARCHAR(7) for standard hex codes like '#RRGGBB'

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        // We could add an index here, though not explicitly required by your SQL,
        // it can be useful for quickly finding levels by the min_xp or max_xp range.
        index('idx_levels_min_xp').on(table.minXp),
    ],
);

export type Level = typeof levels.$inferSelect;
export type NewLevel = typeof levels.$inferInsert;
