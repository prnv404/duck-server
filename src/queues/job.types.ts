export interface GenerateQuestionsJob {
    prompt: string;
    topicId: string;
    model?: string;
    difficulty?: number;
    count?: number;
    language?: string;
    examType?: string;
}

export interface ProcessAudioJob {
    queueId: string;
    questionText: string;
}

export interface JobStatusResponse {
    jobId: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'stuck';
    progress?: number;
    result?: any;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    finishedAt?: Date;
}
