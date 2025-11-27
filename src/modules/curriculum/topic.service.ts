import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import { subjects, topics, userTopicProgress } from '@/database/schema';
import { ServiceHelper } from '@/common/utils';
import { eq, sql, and } from 'drizzle-orm'; // Added 'and' import

export enum PerformanceCategory {
    WEAK = 'weak',
    AVERAGE = 'average',
    STRONG = 'strong',
}

export interface SubjectAccuracy {
    subjectName: string;
    accuracy: number; // Percentage (0-100)
    performance: PerformanceCategory;
}

@Injectable()
export class TopicService {
    constructor(@Inject(DatabaseModule.DRIZZLE) private readonly db: DatabaseModule.DrizzleDB) {}

    async getSubjects() {
        const [result] = await this.db.select().from(subjects);

        return ServiceHelper.ensureExists(result, 'Subjects');
    }

    async getSubjectById(id: string) {
        const [result] = await this.db.select().from(subjects).where(eq(subjects.id, id));
        return ServiceHelper.ensureExists(result, id, 'Subject');
    }

    async getTopicsBySubjectId(subjectId: string) {
        const [result] = await this.db.select().from(topics).where(eq(topics.subjectId, subjectId));
        return ServiceHelper.ensureExists(result, subjectId, 'Topics');
    }

    async getTopicById(id: string) {
        const [result] = await this.db.select().from(topics).where(eq(topics.id, id));
        return ServiceHelper.ensureExists(result, id, 'Topic');
    }

    async getSubjectWiseAccuracy(userId: string): Promise<SubjectAccuracy[]> {
        const results = await this.db
            .select({
                subjectName: subjects.name,
                accuracy: sql<number>`AVG(${userTopicProgress.accuracy} * 100)`.as('accuracy'), // Convert decimal to percentage
            })
            .from(userTopicProgress)
            .innerJoin(topics, eq(userTopicProgress.topicId, topics.id))
            .innerJoin(subjects, eq(topics.subjectId, subjects.id))
            .where(
                and(
                    eq(userTopicProgress.userId, userId),
                    sql`${userTopicProgress.questionsAttempted} > 0`, // Only consider topics with progress
                ),
            )
            .groupBy(subjects.id, subjects.name)
            .orderBy(sql`accuracy DESC`);

        return results.map((row) => {
            const accuracy = Math.round(row.accuracy * 100) / 100; // Round to 2 decimals
            let performance: PerformanceCategory;

            if (accuracy < 70) {
                performance = PerformanceCategory.WEAK;
            } else if (accuracy < 85) {
                performance = PerformanceCategory.AVERAGE;
            } else {
                performance = PerformanceCategory.STRONG;
            }

            return {
                subjectName: row.subjectName,
                accuracy,
                performance,
            };
        });
    }
}
