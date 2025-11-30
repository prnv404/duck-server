import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import { subjects, topics, userTopicProgress } from '@/database/schema';
import { ServiceHelper } from '@/common/utils';
import { eq, sql, and, inArray, exists } from 'drizzle-orm'; // Added 'exists' and 'inArray' imports
import { users } from '@/database/schema/users'; // Import users if needed for joins

export enum PerformanceCategory {
    WEAK = 'weak',
    AVERAGE = 'average',
    STRONG = 'strong',
}

export interface SubjectAccuracy {
    subjectId: string;
    subjectName: string;
    accuracy: number; // Percentage (0-100)
    performance: PerformanceCategory;
}

// New interfaces for responses (matching DB shape; extend as needed)
export interface UserEnrollment {
    id: string;
    userId: string;
    boardId: string;
    level: string;
    enrolledAt: Date;
    isPrimary: boolean;
}

export interface SyllabusEntry {
    id: string;
    boardId: string;
    level: string;
    topicId: string;
    createdAt: Date;
}

@Injectable()
export class CurriculumService {
    constructor(@Inject(DatabaseModule.DRIZZLE) private readonly db: DatabaseModule.DrizzleDB) {}

    async getSubjects() {
        const results = await this.db.select().from(subjects);
        return ServiceHelper.ensureExists(results.length > 0 ? results : null, 'Subjects');
    }

    async getSubjectById(id: string) {
        const [result] = await this.db.select().from(subjects).where(eq(subjects.id, id));
        return ServiceHelper.ensureExists(result, id, 'Subject');
    }

    async getTopicsBySubjectId(subjectId: string) {
        // Fixed: Return full array
        const results = await this.db.select().from(topics).where(eq(topics.subjectId, subjectId));
        return ServiceHelper.ensureExists(results.length > 0 ? results : null, subjectId, 'Topics');
    }

    async getTopicById(id: string) {
        const [result] = await this.db.select().from(topics).where(eq(topics.id, id));
        return ServiceHelper.ensureExists(result, id, 'Topic');
    }

    async getSubjectWiseAccuracy(userId: string): Promise<SubjectAccuracy[]> {
        // Build base WHERE conditions
        const baseWhere = and(eq(userTopicProgress.userId, userId), sql`${userTopicProgress.questionsAttempted} > 0`);

        let fullWhere = baseWhere;

        const query = this.db
            .select({
                subjectId: subjects.id,
                subjectName: subjects.name,
                accuracy: sql<number>`AVG(${userTopicProgress.accuracy})`.as('accuracy'),
            })
            .from(userTopicProgress)
            .innerJoin(topics, eq(userTopicProgress.topicId, topics.id))
            .innerJoin(subjects, eq(topics.subjectId, subjects.id))
            .where(fullWhere)
            .groupBy(subjects.id, subjects.name)
            .orderBy(sql`accuracy DESC`);

        const results = await query;

        return results.map((row) => {
            const accuracy = Math.round(row.accuracy * 100) / 100; // Round to 2 decimals
            let performance: PerformanceCategory;

            if (accuracy < 50) {
                performance = PerformanceCategory.WEAK;
            } else if (accuracy < 70) {
                performance = PerformanceCategory.AVERAGE;
            } else {
                performance = PerformanceCategory.STRONG;
            }

            return {
                subjectId: row.subjectId,
                subjectName: row.subjectName,
                accuracy,
                performance,
            };
        });
    }
}
