import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Subject, Topic } from '@/database/schema';

@ObjectType()
export class SubjectModel implements Subject {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    iconUrl: string | null;

    @Field(() => String, { nullable: true })
    colorCode: string | null;

    @Field(() => Int, { nullable: true })
    displayOrder: number | null;

    @Field(() => Int, { nullable: true })
    weightage: number | null;

    @Field(() => Boolean, { nullable: true, defaultValue: true, name: 'isActiveInRandom' })
    is_active_in_random: boolean | null;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => [TopicModel], { nullable: true })
    topics?: TopicModel[];
}

@ObjectType()
export class TopicModel implements Topic {
    @Field(() => ID)
    id: string;

    @Field(() => ID)
    subjectId: string;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    description: string | null;

    @Field(() => Int, { nullable: true })
    displayOrder: number | null;

    @Field(() => Int, { nullable: true })
    weightage: number | null;

    @Field(() => Boolean, { nullable: true, defaultValue: true, name: 'isActiveInRandom' })
    is_active_in_random: boolean | null;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => SubjectModel)
    subject?: SubjectModel;
}
