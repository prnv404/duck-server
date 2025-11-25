import { Args, Mutation, Query, Resolver, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UserModel } from './user.model';
import { GraphQLISODateTime } from '@nestjs/graphql'; // Needed for Date objects
import { CreateUserInput, UpdateUserInput } from './user.dto';
import { UserService } from './user.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '@/common/guards';
import { UserStatusModel } from '../user_stats';

@Resolver(() => UserModel)
@UseGuards(GqlAuthGuard)
export class UsersResolver {

    constructor(private readonly userService: UserService) { }

    @Query(() => UserModel, { description: 'Get the profile of the authenticated user' })
    async me(@CurrentUser() user: UserModel): Promise<UserModel> {
        return await this.userService.getUser(user.id);
    }

    @Query(() => UserModel, { description: 'Get a user by ID' })
    async getUser(
        @Args('id', { type: () => ID, description: 'The string ID of the user' }) id: string
    ): Promise<UserModel> {
        return await this.userService.getUser(id);
    }


    @Query(() => [UserModel], { description: 'Get a list of all users' })
    async getUsers(
        @Args('limit', { type: () => Number, defaultValue: 10 }) limit: number,
        @Args('offset', { type: () => Number, defaultValue: 0 }) offset: number,
    ): Promise<UserModel[]> {
        return await this.userService.findAll(limit, offset);
    }

    @ResolveField(() => UserStatusModel, { description: 'The user\'s status.', nullable: true })
    async userStatus(@Parent() user: UserModel): Promise<UserStatusModel | null> {
        return await this.userService.getUserStatus(user.id);
    }

    // =================================================================
    // 2. MUTATIONS 
    // =================================================================


    @Mutation(() => UserModel, { description: 'Register a new user account' })
    async createUser(
        @Args('input') input: CreateUserInput
    ): Promise<UserModel> {
        return await this.userService.createUser(input);
    }


    @Mutation(() => UserModel, { description: 'Update an existing user profile' })
    async updateUser(
        @Args('input') input: UpdateUserInput
    ): Promise<UserModel> {
        return await this.userService.updateUser(input.id, input);
    }


    @Mutation(() => UserModel, { description: 'Delete the user\'s account' })
    async deleteUser(
        @Args('id', { type: () => ID, description: 'The ID of the user to delete' }) id: string
    ): Promise<UserModel> {
        return await this.userService.deleteUser(id);
    }
}