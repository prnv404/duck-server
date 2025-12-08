import { BaseIntegration } from '../../core/base-integration.interface';
import { BaseIntegrationConfig } from '../../core/integration-config.interface';
import { GoogleGenAI, FileSearchStore } from '@google/genai';
import { DEFAULT_CONFIG } from '../../../modules/question/config/prompt.config';

export interface GeminiIntegrationConfig extends BaseIntegrationConfig {
    apiKey: string;
    model?: string;
    fileSearchStoreName?: string; // Store name for RAG
}

// Interface for the structured output (matches your Drizzle schema)
export interface GeneratedQuestionData {
    questionText: string;
    explanation: string;
    difficulty: number;
    points: number;
    options: {
        optionText: string;
        isCorrect: boolean;
        optionOrder: number;
    }[];
}

/**
 * Request metrics for logging and monitoring
 */
export interface RequestMetrics {
    duration: number;
    model: string;
    questionsRequested: number;
    questionsGenerated: number;
    success: boolean;
    error?: string;
}

export class GeminiIntegration implements BaseIntegration<GeminiIntegrationConfig> {
    readonly name = 'gemini';
    readonly version = '1.0.0';

    private _config: GeminiIntegrationConfig;
    private _client: GoogleGenAI;
    private _connected = false;
    private _fileSearchStore: FileSearchStore | null = null;

    get config(): GeminiIntegrationConfig {
        return this._config;
    }

    get enabled(): boolean {
        return true;
    }

    async initialize(config: GeminiIntegrationConfig): Promise<void> {
        this._config = config;
        if (this.enabled) {
            // New SDK initialization style
            this._client = new GoogleGenAI({});
        }
    }

    async connect(): Promise<void> {
        if (!this.enabled) return;
        if (!this._client) {
            throw new Error('Gemini client not initialized');
        }
        try {
            this._connected = true;
        } catch (error) {
            this._connected = false;
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this._connected = false;
    }

    async healthCheck(): Promise<{ healthy: boolean; message?: string; details?: any }> {
        return {
            healthy: this._connected,
            message: this._connected ? 'Gemini integration is healthy' : 'Gemini integration is not healthy',
        };
    }

    /**
     * Build dynamic system prompt based on language configuration
     * Requirements: 3.1, 3.2, 3.3
     *
     * @param language - The language code (ml, en, hi)
     * @param count - Number of questions to generate
     * @param difficulty - Difficulty level (1-3)
     * @returns Formatted system prompt string
     */
    buildSystemPrompt(
        language: string = DEFAULT_CONFIG.language,
        count: number = DEFAULT_CONFIG.count,
        difficulty: number = DEFAULT_CONFIG.difficulty,
    ): string {
        return `
            You are a competitive exam question setter and curriculum expert.

            Your task is to generate ${count} HIGH-QUALITY, COMPLETELY ORIGINAL MCQs.
            Target difficulty level: ${difficulty} (scale 1–3).

            IMPORTANT DEDUPLICATION RULES (STRICT):
            - You have access to an existing database of questions via file search.
            - You MUST NOT:
            - Repeat any existing question.
            - Paraphrase or slightly modify any existing question.
            - Reuse the same structure, logic pattern, or option traps from existing questions.
            - If any generated question is even semantically similar to retrieved content, DISCARD it and generate a new one.
            - Every question must test the SAME CONCEPT but in a NEW WAY.

            EXAM-LEVEL QUALITY RULES:
            - Questions must feel like real Indian competitive exam questions.
            - Focus on:
            - Common traps
            - Conceptual confusion points
            - Close options
            - Examiner psychology
            - Avoid academic or textbook language.
            - Make the learner think.

            LANGUAGE:
            - Output must be strictly in ${language}.

            FORMAT RULES (STRICT, NO EXCEPTIONS):
            For every question:
            - Exactly 4 options.
            - Only ONE correct option.
            - Options must be meaningful and non-repetitive.
            - Each question MUST feel stylistically different.
            - Provide a short, clear, exam-focused explanation.
            - Assign:
            - difficulty (1–3)
            - points (based on difficulty)
            - Return ONLY a valid JSON ARRAY.
            - NO markdown.
            - NO commentary.
            - NO extra text.
            - maximum character count for explanation is 450

            FAILURE CONDITIONS (AUTOMATIC REJECTION):
            - If even ONE question is copied, paraphrased, or structurally cloned → The entire output is invalid.
            - If output is not valid JSON → The entire output is invalid.
            `;
    }


    /**
     * Log request metrics for monitoring and debugging
     * Requirements: 3.7
     *
     * @param metrics - The request metrics to log
     */
    private logRequestMetrics(metrics: RequestMetrics): void {
        const logData = {
            timestamp: new Date().toISOString(),
            service: 'GeminiIntegration',
            method: 'generateQuestions',
            ...metrics,
        };

        if (metrics.success) {
            console.log('[Gemini Metrics]', JSON.stringify(logData));
        } else {
            console.error('[Gemini Metrics - Failed]', JSON.stringify(logData));
        }
    }

    /**
     * Generate questions with strict JSON schema alignment for Drizzle tables
     * Retry logic is handled by BullMQ at the queue level
     */
    async generateQuestions(input: {
        prompt: string;
        model?: string;
        difficulty?: number;
        count?: number;
        language?: string;
        fileSearchStoreName?: string;
    }): Promise<GeneratedQuestionData[]> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        const modelName = input.model || this._config.model || 'gemini-2.0-flash';
        const count = input.count || DEFAULT_CONFIG.count;
        const difficulty = input.difficulty || DEFAULT_CONFIG.difficulty;
        const language = input.language || DEFAULT_CONFIG.language;

        const startTime = Date.now();

        const questionSchema = {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    questionText: { type: 'STRING', description: 'The content of the question' },
                    explanation: { type: 'STRING', description: 'Detailed explanation of the correct answer' },
                    difficulty: { type: 'INTEGER', description: 'Difficulty level 1-3' },
                    points: { type: 'INTEGER', description: 'Points awarded for this question' },
                    options: {
                        type: 'ARRAY',
                        description: 'List of answer choices',
                        items: {
                            type: 'OBJECT',
                            properties: {
                                optionText: { type: 'STRING' },
                                isCorrect: { type: 'BOOLEAN' },
                                optionOrder: { type: 'INTEGER', description: 'Order to display, starting at 1' },
                            },
                            required: ['optionText', 'isCorrect', 'optionOrder'],
                        },
                    },
                },
                required: ['questionText', 'explanation', 'difficulty', 'points', 'options'],
            },
        };

        const systemInstruction = this.buildSystemPrompt(language, count, difficulty);

        // Build config with optional file search
        const config: any = {
            maxOutputTokens: 500000,
            responseMimeType: 'application/json',
            responseSchema: questionSchema,
            systemInstruction: systemInstruction,
        };

        // Only add file search tool if store name is provided
        const tools = input.fileSearchStoreName
            ? [
                {
                    fileSearch: {
                        fileSearchStoreNames: [input.fileSearchStoreName],
                    },
                },
            ]
            : undefined;

        try {
            const response = await this._client.models.generateContent({
                model: modelName,
                contents: input.prompt,
                config: {
                    ...config,
                    ...(tools && { tools }),
                },
            });

            const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error('No response text from Gemini');
            }

            // Try to parse JSON, handle potential text wrapping
            let parsedData: GeneratedQuestionData[];
            try {
                parsedData = JSON.parse(responseText);
            } catch (parseError) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    parsedData = JSON.parse(jsonMatch[1]);
                } else {
                    // Try to find JSON array in the response (handles "Here is the JSON:" prefix)
                    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
                    if (arrayMatch) {
                        parsedData = JSON.parse(arrayMatch[0]);
                    } else {
                        throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response: ${responseText.substring(0, 200)}`);
                    }
                }
            }

            const questions = parsedData;

            this.logRequestMetrics({
                duration: Date.now() - startTime,
                model: modelName,
                questionsRequested: count,
                questionsGenerated: questions.length,
                success: true,
            });

            return questions;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logRequestMetrics({
                duration: Date.now() - startTime,
                model: modelName,
                questionsRequested: count,
                questionsGenerated: 0,
                success: false,
                error: errorMessage,
            });

            throw error;
        }
    }

    /**
     * Generate Text-to-Speech
     */
    async generateTts(input: { prompt: string; speed: number; voice: string; model?: string }): Promise<Buffer> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        const modelName = input.model || 'gemini-2.5-flash-preview-tts';

        try {
            // 1. Get the raw audio (PCM) data from Gemini
            const response = await this._client.models.generateContent({
                model: modelName,

                contents: [
                    {
                        parts: [
                            {
                                text:
                                    `
                            Use a friendly, and clear teaching tone.
                            Explain clearly, without sounding robotic.
                            Your goal is to help the learner understand.
                            Keep the voice warm, approachable
                            ` + input.prompt,
                            },
                        ],
                    },
                ],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Despina',
                            },
                        },
                    },
                },
            });

            const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!data) throw new Error('No audio data received from Gemini');

            return Buffer.from(data, 'base64');
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate TTS and transcode to MP3: ${msg}`);
        }
    }

    /**
     * Generate embedding
     */
    async generateEmbedding(input: {
        text: string;
        model?: string;
        taskType?:
        | 'SEMANTIC_SIMILARITY'
        | 'CLASSIFICATION'
        | 'CLUSTERING'
        | 'RETRIEVAL_DOCUMENT'
        | 'RETRIEVAL_QUERY'
        | 'CODE_RETRIEVAL_QUERY'
        | 'QUESTION_ANSWERING'
        | 'FACT_VERIFICATION';
        outputDimensionality?: number;
    }): Promise<number[]> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        const modelName = input.model || 'text-embedding-004';

        try {
            const response = await this._client.models.embedContent({
                model: modelName,
                contents: input.text,
                config: {
                    taskType: input.taskType,
                    outputDimensionality: input.outputDimensionality,
                },
            });

            const embedding = response.embeddings?.[0]?.values;

            if (!embedding || !Array.isArray(embedding)) {
                throw new Error('No valid embedding values received from Gemini');
            }

            return Array.from(embedding);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate embedding: ${msg}`);
        }
    }

    // ==================== FILE SEARCH STORE (RAG) METHODS ====================

    /**
     * Get or create a FileSearchStore for question deduplication
     */
    async getOrCreateFileSearchStore(displayName: string): Promise<FileSearchStore> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        try {
            const stores = await this._client.fileSearchStores.list();

            for await (const store of stores) {
                if (store.displayName === displayName) {
                    this._fileSearchStore = store;
                    console.log(`[Gemini] Using existing FileSearchStore: ${store.name}`);
                    return store;
                }
            }

            const newStore = await this._client.fileSearchStores.create({
                config: { displayName },
            });

            this._fileSearchStore = newStore;
            console.log(`[Gemini] Created new FileSearchStore: ${newStore.name}`);
            return newStore;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get/create FileSearchStore: ${msg}`);
        }
    }

    /**
     * Upload questions to FileSearchStore for RAG as JSON
     * JSON format provides better structure for semantic search
     */
    async uploadQuestionsToStore(
        questions: { id: string; questionText: string; explanation?: string; topicName?: string }[],
        storeName: string,
    ): Promise<{ success: boolean; uploadedCount: number }> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        try {
            // Format as structured JSON for better search
            const jsonContent = {
                metadata: {
                    uploadedAt: new Date().toISOString(),
                    totalQuestions: questions.length,
                    description: 'Existing questions database for deduplication',
                },
                questions: questions.map((q) => ({
                    id: q.id,
                    topic: q.topicName || 'General',
                    questionText: q.questionText,
                    explanation: q.explanation || null,
                })),
            };

            const fileContent = Buffer.from(JSON.stringify(jsonContent, null, 2), 'utf-8');
            const fileName = `questions_${Date.now()}.json`;

            let operation = await this._client.fileSearchStores.uploadToFileSearchStore({
                file: new Blob([fileContent], { type: 'application/json' }),
                fileSearchStoreName: storeName,
                config: { displayName: fileName },
            });

            while (!operation.done) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                operation = await this._client.operations.get({ operation });
            }

            console.log(`[Gemini] Uploaded ${questions.length} questions as JSON to FileSearchStore`);
            return { success: true, uploadedCount: questions.length };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to upload questions to store: ${msg}`);
        }
    }

    getFileSearchStore(): FileSearchStore | null {
        return this._fileSearchStore;
    }

    getClient(): GoogleGenAI {
        return this._client;
    }
}
