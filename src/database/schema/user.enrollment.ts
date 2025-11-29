import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { boards } from './boards'; // Import boards
import { relations } from 'drizzle-orm';
import { boolean } from 'drizzle-orm/pg-core';
import { unique } from 'drizzle-orm/pg-core';
import { practiceSessions } from './practice.session';

export const userEnrollments = pgTable(
    'user_enrollments',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        boardId: uuid('board_id')
            .notNull()
            .references(() => boards.id, { onDelete: 'cascade' }), // Can't enroll in deleted board
        level: varchar('level', { length: 20 }).notNull(), // e.g., '10th', '12th', 'degree' (validate in app)
        enrolledAt: timestamp('enrolled_at', { mode: 'date' }).defaultNow().notNull(),
        isPrimary: boolean('is_primary').default(false).notNull(), // Optional: Flag one as default (for legacy targetExam sync)
        // Future: Add fields like targetScore, deadline if needed
    },
    (table) => [
        unique('user_board_level_unique').on(table.userId, table.boardId, table.level),
        index('idx_enrollments_user').on(table.userId),
        index('idx_enrollments_board').on(table.boardId, table.level),
    ],
);

export type UserEnrollment = typeof userEnrollments.$inferSelect;
export type NewUserEnrollment = typeof userEnrollments.$inferInsert;

export const userEnrollmentsRelations = relations(userEnrollments, ({ one, many }) => ({
    user: one(users, {
        fields: [userEnrollments.userId],
        references: [users.id],
    }),
    board: one(boards, {
        fields: [userEnrollments.boardId],
        references: [boards.id],
    }),
    // Tie to sessions (below)
    practiceSessions: many(practiceSessions),
    // Optional: Tie to progress/leaderboards if scoping needed
}));
