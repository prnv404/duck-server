/**
 * Response DTOs for Curriculum Module
 */

export interface SubjectResponseDto {
    id: string;
    name: string;
    iconUrl?: string | null;
    colorCode?: string | null;
    displayOrder?: number | null;
    weightage?: number | null;
    is_active_in_random: boolean;
    createdAt: Date;
}

export interface TopicResponseDto {
    id: string;
    subjectId: string;
    name: string;
    description?: string | null;
    displayOrder?: number | null;
    is_active_in_random: boolean;
    weightage?: number | null;
    createdAt: Date;
}

export interface SubjectAccuracyResponseDto {
    subjectName: string;
    accuracy: number;
    performance: 'weak' | 'average' | 'strong';
}
