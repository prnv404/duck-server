import { ExtractTablesWithRelations } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as schema from '@/database/schema';

/**
 * Badge unlock criteria structure
 */
export interface BadgeCriteria {
    type: 'streak' | 'accuracy' | 'quiz_count' | 'subject_master' | string;
    days?: number;
    percentage?: number;
    min_questions?: number;
    count?: number;
    in_single_session?: boolean;
    subject?: string;
}

/**
 * Drizzle Transaction Type
 */
export type DrizzleTransaction = PgTransaction<
    PostgresJsQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
>;
