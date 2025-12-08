import {
    IsString,
    IsOptional,
    IsNumber,
    Min,
    Max,
    IsUUID,
    IsArray,
    IsEnum,
    MinLength,
    IsBoolean,
    IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Language } from './config/prompt.config';

export class ListQuestionsDto {
    @IsOptional()
    @IsUUID()
    subjectId?: string;

    @IsOptional()
    @IsUUID()
    topicId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5)
    difficulty?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minUpvotes?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxDownvotes?: number;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsDateString()
    createdAfter?: string;

    @IsOptional()
    @IsDateString()
    createdBefore?: string;

    @IsOptional()
    @IsEnum(['createdAt', 'upvotes', 'downvotes', 'difficulty', 'timesAttempted'])
    sortBy?: 'createdAt' | 'upvotes' | 'downvotes' | 'difficulty' | 'timesAttempted';

    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;
}

export class GenerateQuestionDto {
    @IsString()
    @MinLength(10, { message: 'Prompt must be at least 10 characters long' })
    prompt: string;

    @IsString()
    topicId: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(3)
    difficulty?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    count?: number;

    @IsOptional()
    @IsEnum(Language, { message: 'Language must be one of: ml, en, hi' })
    language?: Language;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    useRAG?: boolean; // Enable RAG for question deduplication (default: true if store is ready)
}

export class BatchApproveDto {
    @IsArray()
    queueIds: string[];

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    generateAudio?: boolean; // If true, queue audio generation for approved questions (default: true)
}

export class GenerateAudioDto {
    @IsOptional()
    @IsUUID()
    topicId?: string; // Sync audio for specific topic (optional)

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(200)
    limit?: number; // Limit number of questions to queue (default: 50)
}
