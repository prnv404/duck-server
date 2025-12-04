import { BaseIntegration } from '../../core/base-integration.interface';
import { BaseIntegrationConfig } from '../../core/integration-config.interface';
import { GoogleGenAI } from '@google/genai';
import {
    getExamConfig,
    getLanguageConfig,
    DEFAULT_CONFIG,
    ExamTypeConfig,
    LanguageConfig,
} from '../../../modules/question/config/prompt.config';

export interface GeminiIntegrationConfig extends BaseIntegrationConfig {
    apiKey: string;
    model?: string;
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
 * Requirements: 3.7
 */
export interface RequestMetrics {
    duration: number;
    model: string;
    questionsRequested: number;
    questionsGenerated: number;
    attemptCount: number;
    success: boolean;
    error?: string;
}

/**
 * Sleep helper function for retry delays
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiIntegration implements BaseIntegration<GeminiIntegrationConfig> {
    readonly name = 'gemini';
    readonly version = '1.0.0';

    private _config: GeminiIntegrationConfig;
    private _client: GoogleGenAI;
    private _connected = false;

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
     * Build dynamic system prompt based on exam type and language configuration
     * Requirements: 3.1, 3.2, 3.3
     *
     * @param examType - The exam type (PSC, UPSC, SSC, BANKING, GENERAL)
     * @param language - The language code (ml, en, hi)
     * @param count - Number of questions to generate
     * @param difficulty - Difficulty level (1-3)
     * @returns Formatted system prompt string
     */
    buildSystemPrompt(
        examType: string = DEFAULT_CONFIG.examType,
        language: string = DEFAULT_CONFIG.language,
        count: number = DEFAULT_CONFIG.count,
        difficulty: number = DEFAULT_CONFIG.difficulty,
    ): string {
        const examConfig: ExamTypeConfig = getExamConfig(examType);
        const languageConfig: LanguageConfig = getLanguageConfig(language);

        return `You are a curriculum expert. Generate ${count} high-quality MCQs.
Ensure difficulty is around ${difficulty} (scale 1-3).

${examConfig.promptInstructions}

Focus Areas: ${examConfig.focusAreas.join(', ')}
Question Style: ${examConfig.questionStyle}

${languageConfig.instruction}

For each question:
- Rephrase the question style so every question sounds slightly different.
  (e.g., "Which of the following…", "Identify…", "Find the correct statement…",
  "Below is a question about…", "Choose the right option…", etc.)
- Ensure **exactly 4 options**.
- Only **one correct option**.
- Options should be meaningful, diverse, and not repetitive.
- The correct option must be clearly accurate according to Indian competitive exam standards.
- Provide a short, clear explanation for the answer.
- Return the output strictly in JSON array format.`;
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
     * Includes retry logic with exponential backoff and request metrics logging
     * Requirements: 3.1, 3.2, 3.3, 3.6, 3.7
     */
    async generateQuestions(input: {
        prompt: string;
        model?: string;
        difficulty?: number;
        count?: number;
        language?: string;
        examType?: string;
    }): Promise<GeneratedQuestionData[]> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        const modelName = input.model || this._config.model || 'gemini-2.0-flash';
        const count = input.count || DEFAULT_CONFIG.count;
        const difficulty = input.difficulty || DEFAULT_CONFIG.difficulty;
        const language = input.language || DEFAULT_CONFIG.language;
        const examType = input.examType || DEFAULT_CONFIG.examType;

        const startTime = Date.now();
        const maxRetries = 3;
        let attemptCount = 0;
        let lastError: Error | null = null;

        // DEFINITION FIX: Use string literals instead of SchemaType
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

        // Build dynamic system prompt from configuration (Requirements: 3.1, 3.2, 3.3)
        const systemInstruction = this.buildSystemPrompt(examType, language, count, difficulty);

        // Retry loop with exponential backoff (Requirements: 3.6)
        while (attemptCount < maxRetries) {
            attemptCount++;

            try {
                const response = await this._client.models.generateContent({
                    model: modelName,
                    contents: input.prompt,
                    config: {
                        maxOutputTokens: 100000,
                        responseMimeType: 'application/json',
                        responseSchema: questionSchema,
                        systemInstruction: systemInstruction,
                    },
                });

                // Parse response
                const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
                const parsedData = JSON.parse(responseText!);
                const questions = parsedData as GeneratedQuestionData[];

                // Log success metrics (Requirements: 3.7)
                this.logRequestMetrics({
                    duration: Date.now() - startTime,
                    model: modelName,
                    questionsRequested: count,
                    questionsGenerated: questions.length,
                    attemptCount,
                    success: true,
                });

                return questions;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Log retry attempt
                console.warn(`[Gemini] Attempt ${attemptCount}/${maxRetries} failed: ${lastError.message}`);

                // If not the last attempt, apply exponential backoff (2s, 4s delays)
                if (attemptCount < maxRetries) {
                    const delayMs = Math.pow(2, attemptCount) * 1000;
                    console.log(`[Gemini] Retrying in ${delayMs}ms...`);
                    await sleep(delayMs);
                }
            }
        }

        // All retries exhausted - log failure metrics (Requirements: 3.7)
        this.logRequestMetrics({
            duration: Date.now() - startTime,
            model: modelName,
            questionsRequested: count,
            questionsGenerated: 0,
            attemptCount,
            success: false,
            error: lastError?.message,
        });

        throw new Error(`Failed to generate questions after ${maxRetries} attempts: ${lastError?.message}`);
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
                            Use a calm, friendly, and clear teaching tone.
                            Speak at a medium pace, with smooth transitions.
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
}
