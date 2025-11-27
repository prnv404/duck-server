import { Args, Mutation, Query, Resolver, ID, ResolveField, Parent } from '@nestjs/graphql';
import { User } from './models/user.model';
import { CreateUserInput, UpdateUserInput, UpdateUserStatsInput } from './user.dto';
import { UserService } from './user.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '@/common/guards';
import { UserStats } from './models/user.stats.model';
import { StreakCalendar } from '../gamification/models/streak.calendar.model';

@Resolver(() => User)
@UseGuards(GqlAuthGuard)
export class UsersResolver {
    constructor(private readonly userService: UserService) {}

    @Query(() => User, { description: 'Get the profile of the authenticated user' })
    async me(@CurrentUser() user: User): Promise<User> {
        return (await this.userService.getUser(user.id)) as User;
    }

    @Query(() => User, { description: 'Get a user by ID' })
    async getUser(@Args('id', { type: () => ID, description: 'The string ID of the user' }) id: string): Promise<User> {
        return (await this.userService.getUser(id)) as User;
    }

    @Query(() => [User], { description: 'Get a list of all users' })
    async getUsers(
        @Args('limit', { type: () => Number, defaultValue: 10 }) limit: number,
        @Args('offset', { type: () => Number, defaultValue: 0 }) offset: number,
    ): Promise<User[]> {
        return (await this.userService.findAll(limit, offset)) as User[];
    }

    @ResolveField(() => UserStats, { description: "The user's status.", nullable: true })
    async userStats(@Parent() user: User): Promise<UserStats | null> {
        return (await this.userService.getUserStats(user.id)) as UserStats;
    }

    @ResolveField(() => [StreakCalendar], { description: "The user's streak calendar.", nullable: true })
    async streakCalendar(@Parent() user: User): Promise<StreakCalendar[] | null> {
        return (await this.userService.getStreakCalendar(user.id)) as StreakCalendar[];
    }

    // =================================================================
    // 2. MUTATIONS
    // =================================================================

    @Mutation(() => User, { description: 'Register a new user account' })
    async createUser(@Args('input') input: CreateUserInput): Promise<User> {
        return (await this.userService.createUser(input)) as User;
    }

    @Mutation(() => User, { description: 'Update an existing user profile' })
    async updateUser(@Args('input') input: UpdateUserInput): Promise<User> {
        return (await this.userService.updateUser(input.id, input)) as User;
    }

    @Mutation(() => User, { description: "Delete the user's account" })
    async deleteUser(@Args('id', { type: () => ID, description: 'The ID of the user to delete' }) id: string): Promise<User> {
        return (await this.userService.deleteUser(id)) as User;
    }
}
