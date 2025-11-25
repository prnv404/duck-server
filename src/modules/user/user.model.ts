import { User } from "@/database/schema";
import {
    ObjectType,
    Field,
    ID,
    GraphQLISODateTime
} from "@nestjs/graphql";
import { UserStatusModel } from '../user_stats'


@ObjectType({
    description: 'Represents a user in the system. Sensitive fields are omitted.',
})
export class UserModel implements Omit<User, 'otp' | 'fcmToken' | 'phone'> {

    @Field(() => ID, { description: 'The unique numeric identifier of the user.' })
    id: string;

    @Field(() => String, { description: 'The user\'s unique username.' })
    username: string;

    @Field(() => String, { description: 'The user\'s phone number.' })
    phone: string;

    @Field(() => String, {
        description: 'The user\'s full name.',
        nullable: true,
    })
    fullName: string | null;

    @Field(() => String, {
        description: 'The URL for the user\'s avatar image.',
        nullable: true,
    })
    avatarUrl: string | null;

    @Field(() => String, {
        description: 'The target examination or course the user is preparing for.',
        nullable: true,
    })
    targetExam: string | null;

    @Field(() => Boolean, {
        description: 'Indicates if the user has enabled notifications.',
    })
    notificationEnabled: boolean;

    @Field(() => GraphQLISODateTime, {
        description: 'The date and time the user account was created.',
    })
    createdAt: Date;

    @Field(() => GraphQLISODateTime, {
        description: 'The date and time the user was last active.',
        nullable: true
    })

    @Field(() => GraphQLISODateTime, {
        description: 'The date and time the user was last active.',
        nullable: true
    })
    lastActiveAt: Date | null;

    @Field(() => UserStatusModel, { description: 'The user\'s status.', nullable: true })
    userStatus?: UserStatusModel | null;


}