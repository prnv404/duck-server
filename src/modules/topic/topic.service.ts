import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import { subjects, topics } from '@/database/schema';
import { ServiceHelper } from '@/common/utils';
import { eq } from 'drizzle-orm';

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
}
