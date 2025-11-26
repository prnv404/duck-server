import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users'; // Import users schema
import { relations } from 'drizzle-orm';

export const notificationQueue = pgTable(
    'notification_queue',
    {
        id: uuid('id')
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        // Foreign Key
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),

        // Content & Type
        notificationType: varchar('notification_type', { length: 50 }),

        title: varchar('title', { length: 255 }).notNull(),

        body: text('body').notNull(),

        // Timing
        scheduledAt: timestamp('scheduled_at', { mode: 'date' }).notNull(),

        sentAt: timestamp('sent_at', { mode: 'date' }),

        // Status
        status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'sent', 'failed'

        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('idx_notifications_scheduled').on(table.status, table.scheduledAt),
        index('idx_notifications_user').on(table.userId, sql`created_at DESC`),
    ],
);

export type NotificationQueue = typeof notificationQueue.$inferSelect;
export type NewNotificationQueue = typeof notificationQueue.$inferInsert;

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
    user: one(users, {
        fields: [notificationQueue.userId],
        references: [users.id],
    }),
}));
