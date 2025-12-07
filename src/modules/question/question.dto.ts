import { IsString, IsOptional, IsNumber, Min, Max, IsUUID, IsArray, IsEnum, MinLength } from 'class-validator';
import { Language } from './config/prompt.config';

export class GenerateQuestionDto {
    @IsString()
    @MinLength(10, { message: 'Prompt must be at least 10 characters long' })
    prompt: string;

    @IsUUID()
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
    @Max(40)
    count?: number;

    @IsOptional()
    @IsEnum(Language, { message: 'Language must be one of: ml, en, hi' })
    language?: Language;
}

export class BatchApproveDto {
    @IsArray()
    queueIds: string[];
}
