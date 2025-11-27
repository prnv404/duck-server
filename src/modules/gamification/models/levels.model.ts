// src/graphql/models/level.model.ts
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Level {
    @Field(() => ID)
    id: string;

    @Field(() => Int)
    levelNumber: number;

    @Field({ nullable: true })
    name?: string;

    @Field(() => Int)
    minXp: number;

    @Field(() => Int)
    maxXp: number;

    @Field({ nullable: true })
    iconUrl?: string;

    @Field({ nullable: true })
    colorCode?: string;

    @Field()
    createdAt: Date;
}
