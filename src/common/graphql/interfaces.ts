import { Field, InterfaceType, ID } from '@nestjs/graphql';

@InterfaceType()
export abstract class Node {
    @Field(() => ID)
    id: string;
}

@InterfaceType()
export abstract class Timestamped {
    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}
