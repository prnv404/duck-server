import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { GeminiIntegration, IntegrationRegistry } from '@/integrations';
import * as Database from '@/database';
import { questions, topics } from '@/database/schema';
import { eq, and } from 'drizzle-orm';

const STORE_NAME = 'question-dedup-store';

@Injectable()
export class QuestionStoreService implements OnModuleInit {
    private storeName: string | null = null;
    private isInitialized = false;

    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) { }

    async onModuleInit() {
        // Initialize store on startup
        await this.initializeStore();
    }

    /**
     * Initialize or get existing FileSearchStore
     */
    async initializeStore(): Promise<string> {
        if (this.storeName) return this.storeName;

        const gemini = this.registry.get<GeminiIntegration>('gemini');
        if (!gemini) throw new Error('Gemini integration not found');

        const store = await gemini.getOrCreateFileSearchStore(STORE_NAME);
        this.storeName = store.name!;
        this.isInitialized = true;

        console.log(`[QuestionStore] Initialized with store: ${this.storeName}`);
        return this.storeName;
    }

    /**
     * Get the store name for RAG queries
     */
    getStoreName(): string | null {
        return this.storeName;
    }

    /**
     * Check if store is ready
     */
    isReady(): boolean {
        return this.isInitialized && !!this.storeName;
    }

    /**
     * Sync all approved questions to the FileSearchStore
     * Call this periodically or after batch approvals
     */
    async syncQuestionsToStore(): Promise<{ success: boolean; syncedCount: number }> {
        if (!this.storeName) {
            await this.initializeStore();
        }

        const gemini = this.registry.get<GeminiIntegration>('gemini');
        if (!gemini) throw new Error('Gemini integration not found');

        // Fetch all active questions with their topics
        const allQuestions = await this.db
            .select({
                id: questions.id,
                questionText: questions.questionText,
                explanation: questions.explanation,
                topicName: topics.name,
            })
            .from(questions)
            .leftJoin(topics, eq(questions.topicId, topics.id))
            .where(eq(questions.isActive, true));

        if (allQuestions.length === 0) {
            console.log('[QuestionStore] No questions to sync');
            return { success: true, syncedCount: 0 };
        }

        const result = await gemini.uploadQuestionsToStore(
            allQuestions.map((q) => ({
                id: q.id,
                questionText: q.questionText,
                explanation: q.explanation || undefined,
                topicName: q.topicName || undefined,
            })),
            this.storeName!,
        );

        console.log(`[QuestionStore] Synced ${result.uploadedCount} questions`);
        return { success: true, syncedCount: result.uploadedCount };
    }

    /**
     * Sync questions for a specific topic
     */
    async syncTopicQuestions(topicId: string): Promise<{ success: boolean; syncedCount: number }> {
        if (!this.storeName) {
            await this.initializeStore();
        }

        const gemini = this.registry.get<GeminiIntegration>('gemini');
        if (!gemini) throw new Error('Gemini integration not found');

        const topicQuestions = await this.db
            .select({
                id: questions.id,
                questionText: questions.questionText,
                explanation: questions.explanation,
                topicName: topics.name,
            })
            .from(questions)
            .leftJoin(topics, eq(questions.topicId, topics.id))
            .where(and(eq(questions.topicId, topicId), eq(questions.isActive, true)));

        if (topicQuestions.length === 0) {
            return { success: true, syncedCount: 0 };
        }

        const result = await gemini.uploadQuestionsToStore(
            topicQuestions.map((q) => ({
                id: q.id,
                questionText: q.questionText,
                explanation: q.explanation || undefined,
                topicName: q.topicName || undefined,
            })),
            this.storeName!,
        );

        return { success: true, syncedCount: result.uploadedCount };
    }

    /**
     * Upload a specific array of questions to the store
     * Useful for incremental updates after approving new questions
     */
    async uploadQuestions(
        questionsToUpload: Array<{
            id: string;
            questionText: string;
            explanation?: string;
        }>,
    ): Promise<{ success: boolean; uploadedCount: number }> {
        if (!this.storeName) {
            await this.initializeStore();
        }

        if (questionsToUpload.length === 0) {
            return { success: true, uploadedCount: 0 };
        }

        const gemini = this.registry.get<GeminiIntegration>('gemini');
        if (!gemini) throw new Error('Gemini integration not found');

        const result = await gemini.uploadQuestionsToStore(questionsToUpload, this.storeName!);

        console.log(`[QuestionStore] Uploaded ${result.uploadedCount} questions`);
        return { success: true, uploadedCount: result.uploadedCount };
    }
}



