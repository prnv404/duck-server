import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, IsArray, ArrayNotEmpty, IsInt, Min } from 'class-validator';
import { QuestionPreferenceType } from '@/database/schema';

@InputType()
export class CreateSessionInput {
    @Field(() => ID)
    @IsString()
    userId: string;

    @Field(() => String)
    @IsEnum(QuestionPreferenceType)
    type: QuestionPreferenceType;

    @Field(() => Number, { nullable: true })
    @IsOptional()
    @IsNumber()
    totalQuestions?: number;

    @Field(() => ID, { nullable: true })
    @IsOptional()
    @IsString()
    topicId?: string;

    @Field(() => [ID], { nullable: true })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    subjectIds?: string[];
}

@InputType()
export class SubmitAnswerInput {
    @Field(() => ID)
    @IsString()
    sessionId: string;

    @Field(() => ID)
    @IsString()
    questionId: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    selectedOptionId: string | null;

    @Field(() => Int)
    @IsInt()
    @Min(0)
    timeSpentSeconds: number;
}
