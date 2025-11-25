import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

export interface IPaginatedType<T> {
    items: T[];
    total: number;
    hasMore: boolean;
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
    @ObjectType({ isAbstract: true })
    abstract class PaginatedType implements IPaginatedType<T> {
        @Field(() => [classRef])
        items: T[];

        @Field(() => Int)
        total: number;

        @Field()
        hasMore: boolean;
    }
    return PaginatedType as Type<IPaginatedType<T>>;
}
