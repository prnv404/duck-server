import { Field, ObjectType, Int, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { IsUUID, IsString, IsBoolean, IsOptional, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { GraphQLUUID, GraphQLJSONObject } from 'graphql-scalars'; // Optional: For UUID scalar
import { Board, ExamLevel } from './board.model';

// ================================
// USER ENROLLMENTS
// ================================

@ObjectType()
export class UserEnrollment {
    @Field(() => ID, { description: 'Unique identifier for the enrollment' })
    @IsUUID()
    id: string;

    @Field(() => GraphQLUUID, { description: 'User ID' })
    @IsUUID()
    userId: string;

    @Field(() => GraphQLUUID, { description: 'Board ID' })
    @IsUUID()
    boardId: string;

    @Field(() => ExamLevel, { description: 'Exam level (e.g., 10th, 12th)' })
    @IsString()
    level: ExamLevel;

    @Field(() => Date, { description: 'Enrollment timestamp' })
    @Type(() => Date)
    @IsDate()
    enrolledAt: Date;

    @Field(() => Boolean, { description: 'Whether this is the primary enrollment', defaultValue: false })
    @IsBoolean()
    isPrimary: boolean;

    // Relations (optional: populate via resolvers)
    @Field(() => Board, { description: 'Associated board', nullable: true })
    @IsOptional()
    board?: Board;

    @Field(() => [UserEnrollment], { description: "User's other enrollments" })
    @IsOptional()
    relatedEnrollments?: UserEnrollment[];
}

@InputType()
export class CreateUserEnrollmentInput {
    @Field(() => GraphQLUUID, { description: 'User ID' })
    @IsUUID()
    userId: string;

    @Field(() => GraphQLUUID, { description: 'Board ID' })
    @IsUUID()
    boardId: string;

    @Field(() => ExamLevel, { description: 'Exam level' })
    @IsString()
    level: ExamLevel;

    @Field(() => Boolean, { description: 'Set as primary enrollment', defaultValue: false })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}

@InputType()
export class UpdateUserEnrollmentInput {
    @Field(() => ID, { description: 'ID of the enrollment to update' })
    @IsUUID()
    id: string;

    @Field(() => ExamLevel, { description: 'Updated level', nullable: true })
    @IsOptional()
    @IsString()
    level?: ExamLevel;

    @Field(() => Boolean, { description: 'Updated primary status', nullable: true })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
