import { BaseIntegration } from '../../core/base-integration.interface';
import { BaseIntegrationConfig } from '../../core/integration-config.interface';
import { GoogleGenAI } from '@google/genai';
// Import the Lame class/constructor from the 'node-lame' module

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
     * Generate questions with strict JSON schema alignment for Drizzle tables
     */
    async generateQuestions(input: {
        prompt: string;
        model?: string;
        difficulty?: number;
        count?: number;
    }): Promise<GeneratedQuestionData[]> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        const modelName = input.model || this._config.model || 'gemini-2.0-flash';

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

        const systemInstruction = `You are a curriculum expert. Generate ${input.count || 5} questions. 
        Ensure difficulty is around ${input.difficulty || 1} (scale 1-3).
        You are a curriculum expert. Generate ${input.count || 5} high-quality MCQs.

        Maintain an overall difficulty of ${input.difficulty || 1} (scale 1–3).
        
        Always give question and answer in Malayalam
        
        For each question:
        - Rephrase the question style so every question sounds slightly different.  
        (e.g., “Which of the following…”, “Identify…”, “Find the correct statement…”,  
        “Below is a question about…”, “Choose the right option…”, etc.)
        - Ensure **exactly 4 options**.
        - Only **one correct option**.
        - Options should be meaningful, diverse, and not repetitive.
        - The correct option must be clearly accurate according to Indian competitive exam standards.
        - Provide a short, clear explanation for the answer.
        - Return the output strictly in JSON array format.
        `;

        try {
            const response = await this._client.models.generateContent({
                model: modelName || 'gemini-2.5-flash',
                contents: input.prompt,
                config: {
                    maxOutputTokens: 100000,
                    responseMimeType: 'application/json',
                    responseSchema: questionSchema, // Pass the schema object directly
                    systemInstruction: systemInstruction,
                },
            });

            console.log(response);
            // Parse response
            const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(responseText);
            const parsedData = JSON.parse(responseText!);
            return parsedData as GeneratedQuestionData[];
        } catch (error) {
            // Enhanced error logging for the new SDK
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate questions: ${msg}`);
        }
    }

    /**
     * Generate Text-to-Speech
     */
    // ... (class definition and other methods)

    /**
     * Generate Text-to-Speech
     */
    async generateTts(input: {
        prompt: string;
        speed: number;
        voice: string;
        model?: string;
    }): Promise<Buffer> {
        if (!this._connected) throw new Error('Gemini integration not connected');

        const modelName = input.model || 'gemini-2.5-flash-preview-tts';

        try {
            // 1. Get the raw audio (PCM) data from Gemini
            const response = await this._client.models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: input.prompt }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: input.voice || 'Kore',
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

    // ... (rest of the class)

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
