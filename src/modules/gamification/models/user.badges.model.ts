import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Badge } from './badges.model';

@ObjectType()
export class UserBadge {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    userId: string;

    @Field(() => ID)
    badgeId: string;

    @Field({ nullable: true })
    unlockedAt?: Date;

    @Field(() => Float)
    progressPercentage: number;

    @Field()
    createdAt: Date;

    // Relations
    @Field(() => Badge)
    badge: Badge;
}
