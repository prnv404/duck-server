import { Inject, Injectable } from '@nestjs/common';
import * as DatabaseModule from '@/database';
import { NewUser, User, users, UserStats, userStats } from '@/database/schema';
import { eq, or } from 'drizzle-orm';
import { ServiceHelper } from '@/common/utils';

type DrizzleDB = DatabaseModule.DrizzleDB;

@Injectable()
export class UserService {

    constructor(@Inject(DatabaseModule.DRIZZLE) private readonly db: DrizzleDB) { }

    async createUser(data: NewUser): Promise<User> {
        const existingUser = await this.db.query.users.findFirst({
            where: or(eq(users.phone, data.phone), eq(users.username, data.username))
        })

        ServiceHelper.ensureUnique(!!existingUser, 'User already exists.');

        const [user] = await this.db.insert(users).values(data).returning();
        return user;
    }

    async getUser(id: string): Promise<User> {
        const [user] = await this.db.select().from(users).$withCache({
            autoInvalidate: true,
            config: {
                ex: 60 * 60 * 24
            }
        }).where(eq(users.id, id));

        return ServiceHelper.ensureExists(user, id, 'User');
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const { id: _, ...updateData } = data;

        const [updatedUser] = await this.db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        return ServiceHelper.ensureExists(updatedUser, id, 'User');
    }


    async findByUsernameOrPhone(usernameOrPhone: string): Promise<User | undefined> {
        const user = await this.db.query.users.findFirst({
            where: or(eq(users.phone, usernameOrPhone), eq(users.username, usernameOrPhone))
        });
        return user;
    }

    async findAll(limit: number, offset: number): Promise<User[]> {
        return await this.db.select().from(users).limit(limit).offset(offset);
    }

    async deleteUser(id: string): Promise<User> {
        const [deletedUser] = await this.db
            .delete(users)
            .where(eq(users.id, id))
            .returning();

        return ServiceHelper.ensureExists(deletedUser, id, 'User');
    }

    async updateQuestionPreference(id: string, data: Partial<User>): Promise<User> {
        const { id: _, ...updateData } = data;

        const [updatedUser] = await this.db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        return ServiceHelper.ensureExists(updatedUser, id, 'User');
    }

    async getUserStatus(id: string): Promise<UserStats> {

        const [user] = await this.db.select().from(users).where(eq(users.id, id));

        ServiceHelper.ensureExists(user, id, 'User');

        const [_userStats] = await this.db.select().from(userStats).where(eq(userStats.userId, id));

       return ServiceHelper.ensureExists(_userStats, id, 'UserStats');
    }

    async updateUserStats(id: string, data: Partial<UserStats>): Promise<UserStats> {
        const { id: _, ...updateData } = data;

        const [updatedUserStats] = await this.db
            .update(userStats)
            .set(updateData)
            .where(eq(userStats.userId, id))
            .returning();

        return ServiceHelper.ensureExists(updatedUserStats, id, 'UserStats');
    }

}