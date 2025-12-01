import { IsString, IsOptional, IsNumber, Min, Max, IsUUID, IsArray } from 'class-validator';

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
    @Max(40)
    count?: number;
}

export class BatchApproveDto {

    @IsArray()
    queueIds: string[];
}
