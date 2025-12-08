export interface GenerateQuestionsJob {
    prompt: string;
    topicId: string;
    model?: string;
    difficulty?: number;
    count?: number;
    language?: string;
    useRAG?: boolean; // Enable RAG for question deduplication
}

export interface ProcessAudioJob {
    queueId?: string; // Optional - only present when coming from approval flow
    questionId: string; // The actual question ID in the questions table
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
