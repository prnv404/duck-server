import { Field, ObjectType, Int, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { IsUUID, IsString, IsBoolean, IsOptional, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { GraphQLUUID, GraphQLJSONObject } from 'graphql-scalars'; // Optional: For UUID scalar
import { Board, ExamLevel } from './board.model';
import { UserEnrollment } from './user.enrollment.model';

@ObjectType()
export class SyllabusEntry {
    @Field(() => ID, { description: 'Unique identifier for the syllabus entry' })
    @IsUUID()
    id: string;

    @Field(() => GraphQLUUID, { description: 'Board ID' })
    @IsUUID()
    boardId: string;

    @Field(() => ExamLevel, { description: 'Exam level' })
    @IsString()
    level: ExamLevel;

    @Field(() => GraphQLUUID, { description: 'Topic ID' })
    @IsUUID()
    topicId: string;

    @Field(() => Date, { description: 'Creation timestamp' })
    @Type(() => Date)
    @IsDate()
    createdAt: Date;

    // Relations (optional: populate via resolvers)
    @Field(() => Board, { description: 'Associated board', nullable: true })
    @IsOptional()
    board?: Board;

    @Field(() => [UserEnrollment], { description: 'Enrollments using this syllabus', nullable: true })
    @IsOptional()
    enrollments?: UserEnrollment[];
}

@InputType()
export class CreateSyllabusEntryInput {
    @Field(() => GraphQLUUID, { description: 'Board ID' })
    @IsUUID()
    boardId: string;

    @Field(() => ExamLevel, { description: 'Exam level' })
    @IsString()
    level: ExamLevel;

    @Field(() => GraphQLUUID, { description: 'Topic ID' })
    @IsUUID()
    topicId: string;
}

@InputType()
export class UpdateSyllabusEntryInput {
    @Field(() => ID, { description: 'ID of the syllabus entry to update' })
    @IsUUID()
    id: string;

    @Field(() => GraphQLUUID, { description: 'Updated board ID', nullable: true })
    @IsOptional()
    @IsUUID()
    boardId?: string;

    @Field(() => ExamLevel, { description: 'Updated level', nullable: true })
    @IsOptional()
    @IsString()
    level?: ExamLevel;

    @Field(() => GraphQLUUID, { description: 'Updated topic ID', nullable: true })
    @IsOptional()
    @IsUUID()
    topicId?: string;
}

// ================================
// Query/Mutation Args (Optional: For resolvers)
// ================================

@InputType()
export class FindBoardsArgs {
    @Field(() => String, { nullable: true, description: 'Filter by name (partial match)' })
    @IsOptional()
    @IsString()
    name?: string;

    @Field(() => Boolean, { nullable: true, description: 'Filter by active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

@InputType()
export class FindUserEnrollmentsArgs {
    @Field(() => GraphQLUUID, { nullable: true, description: 'Filter by user ID' })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @Field(() => GraphQLUUID, { nullable: true, description: 'Filter by board ID' })
    @IsOptional()
    @IsUUID()
    boardId?: string;

    @Field(() => ExamLevel, { nullable: true, description: 'Filter by level' })
    @IsOptional()
    @IsString()
    level?: ExamLevel;
}

@InputType()
export class FindSyllabusEntriesArgs {
    @Field(() => GraphQLUUID, { nullable: true, description: 'Filter by board ID' })
    @IsOptional()
    @IsUUID()
    boardId?: string;

    @Field(() => ExamLevel, { nullable: true, description: 'Filter by level' })
    @IsOptional()
    @IsString()
    level?: ExamLevel;

    @Field(() => GraphQLUUID, { nullable: true, description: 'Filter by topic ID' })
    @IsOptional()
    @IsUUID()
    topicId?: string;
}

// ================================
// Response Wrappers (Optional: For paginated queries)
// ================================

@ObjectType()
export class BoardResponse {
    @Field(() => [Board])
    data: Board[];

    @Field(() => Int)
    total: number;
}

@ObjectType()
export class UserEnrollmentResponse {
    @Field(() => [UserEnrollment])
    data: UserEnrollment[];

    @Field(() => Int)
    total: number;
}

@ObjectType()
export class SyllabusEntryResponse {
    @Field(() => [SyllabusEntry])
    data: SyllabusEntry[];

    @Field(() => Int)
    total: number;
}
