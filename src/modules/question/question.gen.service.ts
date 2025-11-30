import { GeminiIntegration, IntegrationRegistry, StorageIntegration } from '@/integrations';
import { Injectable, InternalServerErrorException, Inject, BadRequestException } from '@nestjs/common';
import * as Database from '@/database';
import { questionQueue, questions, answerOptions, Question, AnswerOption } from '@/database/schema';
import { eq, sql, gt } from 'drizzle-orm';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as wav from 'wav';

@Injectable()
export class QuestionGenerationService {
    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) { }

    async generateQuestions(input: { prompt: string; topicId: string; model?: string; difficulty?: number; count?: number }) {
        const gemini = this.registry.get<GeminiIntegration>('gemini');

        if (!gemini) {
            throw new InternalServerErrorException('Gemini integration not found');
        }

        const result = await gemini.generateQuestions(input);
        const queueIds: string[] = [];
        for (const res of result) {
            const [queue] = await this.db.insert(questionQueue).values({
                question: res,
                answer_option: res.options,
                is_approved: false,
                is_rejected: false,
                topicId: input.topicId,
            }).returning()

            queueIds.push(queue.id);
        }

        return {
            success: true, count: result.length,
            queueId: queueIds,
            questions: result
        };
    }

    async approveQuestion(queueId: string) {
        const gemini = this.registry.get<GeminiIntegration>('gemini');
        const storage = this.registry.get<StorageIntegration>('storage');

        if (!gemini || !storage) {
            throw new InternalServerErrorException('Required integrations (Gemini or Storage) not found');
        }

        // 1. Fetch from Queue
        const [queueItem] = await this.db.select().from(questionQueue).where(eq(questionQueue.id, queueId));

        if (!queueItem) {
            throw new BadRequestException('Question not found in queue');
        }

        if (queueItem.is_approved) {
            throw new BadRequestException('Question already approved');
        }

        const questionData = queueItem.question as Pick<Question, 'questionText' | 'explanation' | 'difficulty' | 'points'> & {
            options: Pick<AnswerOption, 'optionText' | 'isCorrect' | 'optionOrder'>[];
        };

        // 2. Generate and Upload Audio
        let audioUrl: string | null = null;
        try {
            audioUrl = await this.processAndUploadAudio(gemini, storage, queueItem.id, questionData.questionText);
        } catch (error) {
            console.error('Failed to generate/upload audio:', error);
            throw new InternalServerErrorException('Failed to generate audio for question');
        }

        // 3. Move to Questions Table
        await this.db.transaction(async (tx) => {
            const [newQuestion] = await tx
                .insert(questions)
                .values({
                    questionText: questionData.questionText,
                    explanation: questionData.explanation,
                    difficulty: questionData.difficulty,
                    points: questionData.points,
                    audioUrl: audioUrl,
                    topicId: queueItem.topicId,
                })
                .returning();

            if (questionData.options && Array.isArray(questionData.options)) {
                for (const opt of questionData.options) {
                    await tx.insert(answerOptions).values({
                        questionId: newQuestion.id,
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect,
                        optionOrder: opt.optionOrder,
                    });
                }
            }

            await tx.update(questionQueue).set({ is_approved: true }).where(eq(questionQueue.id, queueId));
        });

        return { success: true, questionId: queueId };
    }

    private async processAndUploadAudio(
        gemini: GeminiIntegration,
        storage: StorageIntegration,
        id: string,
        text: string,
    ): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpeg = require('fluent-ffmpeg');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

        ffmpeg.setFfmpegPath(ffmpegPath);

        const audioBuffer = await gemini.generateTts({
            prompt: text,
            speed: 1,
            voice: 'achernar', // Default voice
        });

        const debugDir = path.join(process.cwd(), 'audio_debug');

        try {
            await fsPromises.mkdir(debugDir, { recursive: true });
        } catch (error) {
            // Ignore if exists
        }

        const localWavFileName = `${id}.wav`;
        const localWavFilePath = path.join(debugDir, localWavFileName);
        const localMp3FileName = `${id}.mp3`;
        const localMp3FilePath = path.join(debugDir, localMp3FileName);

        // 1. Save WAV
        await this.saveWaveFile(localWavFilePath, audioBuffer);

        const stats = await fsPromises.stat(localWavFilePath);
        console.log(`[AudioDebug] Saved WAV to: ${localWavFilePath} (Size: ${stats.size} bytes)`);

        if (stats.size === 0) {
            throw new Error('Generated WAV file is empty');
        }

        // 2. Convert to MP3
        await new Promise<void>((resolve, reject) => {
            ffmpeg(localWavFilePath)
                .toFormat('mp3')
                .audioBitrate(128)
                .on('error', (err) => {
                    console.error('[AudioDebug] FFmpeg error:', err);
                    reject(err);
                })
                .on('end', () => {
                    console.log(`[AudioDebug] Converted to MP3: ${localMp3FilePath}`);
                    resolve();
                })
                .save(localMp3FilePath);
        });

        // 3. Read MP3
        const mp3Buffer = await fsPromises.readFile(localMp3FilePath);
        console.log(`[AudioDebug] Read MP3 buffer size: ${mp3Buffer.length} bytes`);

        // 4. Upload MP3
        const storageFileName = `questions/${id}.mp3`;
        await storage.uploadFile(storageFileName, mp3Buffer);
        const publicUrl = await storage.getFileUrl(storageFileName);

        // 5. Clean up local files
        try {
            await fsPromises.unlink(localWavFilePath);
            await fsPromises.unlink(localMp3FilePath);
            console.log(`[AudioDebug] Deleted local files: ${localWavFilePath}, ${localMp3FilePath}`);
        } catch (error) {
            console.warn(`[AudioDebug] Failed to delete local files`, error);
        }

        return publicUrl;
    }

    private async saveWaveFile(
        filename: string,
        pcmData: Buffer,
        channels = 1,
        rate = 24000,
        sampleWidth = 2,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const writer = new wav.Writer({
                channels,
                sampleRate: rate,
                bitDepth: sampleWidth * 8,
            });

            const fileStream = fs.createWriteStream(filename);

            writer.pipe(fileStream);

            fileStream.on('finish', () => {
                resolve();
            });

            writer.on('error', (err) => {
                reject(err);
            });

            fileStream.on('error', (err) => {
                reject(err);
            });

            writer.end(pcmData);
        });
    }
}
