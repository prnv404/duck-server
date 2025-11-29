import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import { subjects, topics, userTopicProgress, boards, userEnrollments, syllabusEntries } from '@/database/schema';
import { ServiceHelper } from '@/common/utils';
import { eq, sql, and, inArray, exists } from 'drizzle-orm'; // Added 'exists' and 'inArray' imports
import { users } from '@/database/schema/users'; // Import users if needed for joins

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
        // Fixed: Return full array instead of destructuring to single
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

    async getSubjectWiseAccuracy(userId: string, enrollmentId?: string): Promise<SubjectAccuracy[]> {
        // Build base WHERE conditions
        const baseWhere = and(eq(userTopicProgress.userId, userId), sql`${userTopicProgress.questionsAttempted} > 0`);

        let fullWhere = baseWhere;

        // If enrollmentId provided, add EXISTS filter for syllabus-eligible topics
        if (enrollmentId) {
            // Subquery to get boardId and level from enrollment
            const enrollmentSubquery = this.db
                .select({ boardId: userEnrollments.boardId, level: userEnrollments.level })
                .from(userEnrollments)
                .where(eq(userEnrollments.id, enrollmentId))
                .as('enrollment_sub');

            // EXISTS condition to filter topics in the syllabus for this board+level
            const existsCondition = exists(
                this.db
                    .select()
                    .from(syllabusEntries)
                    .innerJoin(
                        enrollmentSubquery,
                        and(
                            eq(syllabusEntries.boardId, sql`enrollment_sub.boardId`),
                            eq(syllabusEntries.level, sql`enrollment_sub.level`),
                        ),
                    )
                    .where(eq(syllabusEntries.topicId, userTopicProgress.topicId)),
            );

            fullWhere = and(baseWhere, existsCondition);
        }

        const query = this.db
            .select({
                subjectName: subjects.name,
                accuracy: sql<number>`AVG(${userTopicProgress.accuracy} * 100)`.as('accuracy'),
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
                subjectName: row.subjectName,
                accuracy,
                performance,
            };
        });
    }

    // Boards methods (existing, with fix for getBoards)
    async getBoards() {
        // Fixed: Return full array
        const results = await this.db.select().from(boards);
        return ServiceHelper.ensureExists(results.length > 0 ? results : null, 'Boards');
    }

    async getBoardById(id: string) {
        const [result] = await this.db.select().from(boards).where(eq(boards.id, id));
        return ServiceHelper.ensureExists(result, id, 'Board');
    }

    // New: User Enrollments methods
    async getUserEnrollments(userId: string): Promise<UserEnrollment[]> {
        // const results = await this.db
        //     .select()
        //     .from(userEnrollments)
        //     .where(eq(userEnrollments.userId, userId))
        //     .orderBy(userEnrollments.enrolledAt);

        // Optional: Join with boards for enriched data
        const results = await this.db
            .select({
                id: userEnrollments.id,
                userId: userEnrollments.userId,
                boardId: userEnrollments.boardId,
                level: userEnrollments.level,
                enrolledAt: userEnrollments.enrolledAt,
                isPrimary: userEnrollments.isPrimary,
                boardName: boards.name, // Enrich with board details
            })
            .from(userEnrollments)
            .leftJoin(boards, eq(userEnrollments.boardId, boards.id))
            .where(eq(userEnrollments.userId, userId))
            .orderBy(userEnrollments.enrolledAt);

        return ServiceHelper.ensureExists(results.length > 0 ? results : null, `User enrollments for ${userId}`);
    }

    async createUserEnrollment(input: {
        userId: string;
        boardId: string;
        level: string;
        isPrimary?: boolean;
    }): Promise<UserEnrollment> {
        const [result] = await this.db
            .insert(userEnrollments)
            .values({
                ...input,
                enrolledAt: new Date(),
            })
            .returning();

        return ServiceHelper.ensureExists(result, 'New enrollment');
    }

    // New: Syllabus Entries methods
    async getSyllabusEntries(boardId: string, level: string): Promise<SyllabusEntry[]> {
        const results = await this.db
            .select()
            .from(syllabusEntries)
            .where(and(eq(syllabusEntries.boardId, boardId), eq(syllabusEntries.level, level)))
            .orderBy(syllabusEntries.createdAt);

        return ServiceHelper.ensureExists(results.length > 0 ? results : null, `Syllabus for ${boardId}-${level}`);
    }

    async createSyllabusEntry(input: { boardId: string; level: string; topicId: string }): Promise<SyllabusEntry> {
        const [result] = await this.db
            .insert(syllabusEntries)
            .values({
                ...input,
            })
            .returning();

        return ServiceHelper.ensureExists(result, 'New syllabus entry');
    }

    // New: Curriculum integration methods
    async getEligibleTopicsForEnrollment(enrollmentId: string): Promise<any[]> {
        // Returns topics with syllabus context
        const results = await this.db
            .select({
                topicId: syllabusEntries.topicId,
                topicName: topics.name,
                description: topics.description,
                syllabusId: syllabusEntries.id,
            })
            .from(syllabusEntries)
            .innerJoin(topics, eq(syllabusEntries.topicId, topics.id))
            .innerJoin(
                userEnrollments,
                and(eq(syllabusEntries.boardId, userEnrollments.boardId), eq(syllabusEntries.level, userEnrollments.level)),
            )
            .where(eq(userEnrollments.id, enrollmentId))
            .orderBy(topics.displayOrder ?? sql`topics.created_at`);

        return ServiceHelper.ensureExists(results.length > 0 ? results : null, `Eligible topics for enrollment ${enrollmentId}`);
    }

    async getEligibleTopicsForUser(userId: string, boardId: string, level: string): Promise<any[]> {
        const results = await this.db
            .select({
                topicId: syllabusEntries.topicId,
                topicName: topics.name,
                description: topics.description,
            })
            .from(syllabusEntries)
            .innerJoin(topics, eq(syllabusEntries.topicId, topics.id))
            .where(and(eq(syllabusEntries.boardId, boardId), eq(syllabusEntries.level, level)))
            .orderBy(topics.displayOrder ?? sql`topics.created_at`);

        // Filter to user's enrolled topics if needed, but since syllabus is board-level, return all eligible
        return ServiceHelper.ensureExists(
            results.length > 0 ? results : null,
            `Eligible topics for ${userId} in ${boardId}-${level}`,
        );
    }
}
