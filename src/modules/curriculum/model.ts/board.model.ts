import { Field, ObjectType, Int, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { IsUUID, IsString, IsBoolean, IsOptional, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { GraphQLUUID, GraphQLJSONObject } from 'graphql-scalars'; // Optional: For UUID scalar

// Enums (for validation and GraphQL)
export enum ExamLevel {
    TENTH = '10th',
    TWELFTH = '12th',
    DEGREE = 'degree',
}

registerEnumType(ExamLevel, { name: 'ExamLevel' });

// ================================
// BOARDS
// ================================

@ObjectType()
export class Board {
    @Field(() => ID, { description: 'Unique identifier for the board' })
    @IsUUID()
    id: string;

    @Field(() => String, { description: 'Name of the board (e.g., PSC, SSC)' })
    @IsString()
    name: string;

    @Field(() => String, { description: 'Description of the board', nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    @Field(() => Boolean, { description: 'Whether the board is active', defaultValue: true })
    @IsBoolean()
    isActive: boolean;

    @Field(() => Date, { description: 'Creation timestamp' })
    @Type(() => Date)
    @IsDate()
    createdAt: Date;
}

@InputType()
export class CreateBoardInput {
    @Field(() => String, { description: 'Name of the board' })
    @IsString()
    name: string;

    @Field(() => String, { description: 'Description of the board', nullable: true })
    @IsOptional()
    @IsString()
    description?: string;
}

@InputType()
export class UpdateBoardInput {
    @Field(() => ID, { description: 'ID of the board to update' })
    @IsUUID()
    id: string;

    @Field(() => String, { description: 'Updated name', nullable: true })
    @IsOptional()
    @IsString()
    name?: string;

    @Field(() => String, { description: 'Updated description', nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    @Field(() => Boolean, { description: 'Updated active status', nullable: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
