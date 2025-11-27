import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '@/modules/user/models/user.model';

export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
}

registerEnumType(NotificationStatus, {
    name: 'NotificationStatus',
    description: 'Notification queue status',
});

@ObjectType()
export class NotificationQueue {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field({ nullable: true })
    notificationType?: string;

    @Field()
    title: string;

    @Field()
    body: string;

    @Field()
    scheduledAt: Date;

    @Field({ nullable: true })
    sentAt?: Date;

    @Field(() => NotificationStatus)
    status: NotificationStatus;

    @Field()
    createdAt: Date;

    // Relations
    @Field(() => User)
    user: User;
}
