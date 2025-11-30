import { IsString, IsOptional, IsNumber, Min, Max, IsUUID } from 'class-validator';

export class GenerateQuestionDto {
    @IsString()
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
    @Max(20)
    count?: number;
}
