import { IsString, IsEnum, IsOptional, IsNumber, IsArray, IsInt, Min, IsUUID } from 'class-validator';
import { QuestionPreferenceType } from '@/database/schema';

/**
 * DTO for creating a practice session
 */
export class CreateSessionDto {
    @IsEnum(QuestionPreferenceType)
    type: QuestionPreferenceType;

    @IsOptional()
    @IsInt()
    @Min(1)
    totalQuestions?: number;

    @IsOptional()
    @IsUUID()
    topicId?: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    subjectIds?: string[];
}

/**
 * DTO for submitting an answer
 */
export class SubmitAnswerDto {
    @IsUUID()
    questionId: string;

    @IsOptional()
    @IsUUID()
    selectedOptionId?: string | null;

    @IsInt()
    @Min(0)
    timeSpentSeconds: number;
}

/**
 * Response interfaces
 */
export interface QuestionResponseDto {
    id: string;
    topicId: string | null;
    questionText: string;
    explanation?: string | null;
    difficulty: number;
    isActive: boolean;
    createdAt: Date;
    answerOptions: AnswerOptionResponseDto[];
}

export interface AnswerOptionResponseDto {
    id: string;
    questionId: string;
    optionText: string;
    isCorrect: boolean;
    displayOrder: number;
}

export interface PracticeSessionResponseDto {
    id: string;
    userId: string;
    sessionType: string;
    topicId?: string | null;
    totalQuestions: number;
    questionsAttempted: number;
    correctAnswers: number;
    wrongAnswers: number;
    accuracy: string;
    xpEarned: number;
    status: string;
    timeSpentSeconds: number;
    createdAt: Date;
    completedAt?: Date | null;
    questions?: QuestionResponseDto[];
}

export interface SessionAnswerResponseDto {
    id: string;
    sessionId: string;
    questionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
    timeSpentSeconds: number;
    answeredAt: Date;
}
