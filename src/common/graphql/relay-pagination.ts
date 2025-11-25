import { ArgsType, Field, ObjectType, Int } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

// Relay-style cursor pagination
@ArgsType()
export class ConnectionArgs {
    @Field({ nullable: true })
    after?: string;

    @Field({ nullable: true })
    before?: string;

    @Field(() => Int, { nullable: true })
    first?: number;

    @Field(() => Int, { nullable: true })
    last?: number;
}

@ObjectType()
export class PageInfo {
    @Field()
    hasNextPage: boolean;

    @Field()
    hasPreviousPage: boolean;

    @Field({ nullable: true })
    startCursor?: string;

    @Field({ nullable: true })
    endCursor?: string;
}

export function Connection<T>(classRef: Type<T>) {
    @ObjectType(`${classRef.name}Edge`, { isAbstract: true })
    class EdgeType {
        @Field(() => classRef)
        node: T;

        @Field()
        cursor: string;
    }

    @ObjectType(`${classRef.name}Connection`, { isAbstract: true })
    class ConnectionType {
        @Field(() => [EdgeType])
        edges: EdgeType[];

        @Field(() => PageInfo)
        pageInfo: PageInfo;

        @Field(() => Int)
        totalCount: number;
    }

    return ConnectionType;
}
