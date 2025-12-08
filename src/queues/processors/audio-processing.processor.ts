import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as Database from '@/database';
import { questionQueue as questionQueueSchema, questions } from '@/database/schema';
import { GeminiIntegration, IntegrationRegistry, StorageIntegration } from '@/integrations';
import { ProcessAudioJob } from '../job.types';
import { eq } from 'drizzle-orm';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import * as wav from 'wav';

@Processor('audio-processing')
@Injectable()
export class AudioProcessingProcessor {
    private readonly logger = new Logger(AudioProcessingProcessor.name);

    constructor(
        private registry: IntegrationRegistry,
        @Inject(Database.DRIZZLE) private readonly db: Database.DrizzleDB,
    ) {}

    @Process({
        concurrency: 1,
    })
    async handleAudioProcessing(job: Job<ProcessAudioJob>) {
        const { queueId, questionId, questionText } = job.data;

        this.logger.log(`Processing audio for question ${questionId}${queueId ? ` (queue: ${queueId})` : ''}`);

        try {
            // Update queue status if coming from approval flow
            if (queueId) {
                await this.db
                    .update(questionQueueSchema)
                    .set({ status: 'processing_audio' })
                    .where(eq(questionQueueSchema.id, queueId));
            }

            // Get integrations
            const gemini = this.registry.get<GeminiIntegration>('gemini');
            const storage = this.registry.get<StorageIntegration>('storage');

            if (!gemini || !storage) {
                throw new Error('Required integrations not available');
            }

            // Generate and upload audio using questionId as the file identifier
            const audioUrl = await this.processAndUploadAudio(gemini, storage, questionId, questionText);

            // Update the question with audio URL
            await this.db.update(questions).set({ audioUrl }).where(eq(questions.id, questionId));

            // Update queue item status if coming from approval flow
            if (queueId) {
                await this.db
                    .update(questionQueueSchema)
                    .set({
                        status: 'completed',
                        errorMessage: null,
                    })
                    .where(eq(questionQueueSchema.id, queueId));
            }

            this.logger.log(`Audio processing completed for question ${questionId}`);

            return { success: true, questionId, queueId, audioUrl };
        } catch (error) {
            this.logger.error(`Audio processing failed: ${error.message}`, error.stack);

            // Update queue with error if coming from approval flow
            if (queueId) {
                await this.db
                    .update(questionQueueSchema)
                    .set({
                        status: 'failed',
                        errorMessage: error.message,
                        attemptCount: job.attemptsMade,
                    })
                    .where(eq(questionQueueSchema.id, queueId));
            }

            throw error;
        }
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
            voice: 'achernar',
        });

        const debugDir = path.join(process.cwd(), 'audio_temp_storage');

        try {
            await fsPromises.mkdir(debugDir, { recursive: true });
        } catch (error) {
            // Ignore if exists
        }

        const localWavFileName = `${id}.wav`;
        const localWavFilePath = path.join(debugDir, localWavFileName);
        const localMp3FileName = `${id}.mp3`;
        const localMp3FilePath = path.join(debugDir, localMp3FileName);

        try {
            // 1. Save WAV
            await this.saveWaveFile(localWavFilePath, audioBuffer);

            const stats = await fsPromises.stat(localWavFilePath);
            this.logger.debug(`Saved WAV: ${stats.size} bytes`);

            if (stats.size === 0) {
                throw new Error('Generated WAV file is empty');
            }

            // 2. Convert to MP3
            await new Promise<void>((resolve, reject) => {
                ffmpeg(localWavFilePath)
                    .toFormat('mp3')
                    .audioBitrate(128)
                    .on('error', (err) => {
                        this.logger.error('FFmpeg error:', err);
                        reject(err);
                    })
                    .on('end', () => {
                        this.logger.debug('Converted to MP3');
                        resolve();
                    })
                    .save(localMp3FilePath);
            });

            // 3. Read MP3
            const mp3Buffer = await fsPromises.readFile(localMp3FilePath);
            this.logger.debug(`MP3 size: ${mp3Buffer.length} bytes`);

            // 4. Upload MP3
            const storageFileName = `questions/${id}.mp3`;
            await storage.uploadFile(storageFileName, mp3Buffer);
            const publicUrl = await storage.getFileUrl(storageFileName);

            return publicUrl;
        } finally {
            // 5. Clean up local files
            try {
                await fsPromises.unlink(localWavFilePath).catch(() => {});
                await fsPromises.unlink(localMp3FilePath).catch(() => {});
            } catch (error) {
                this.logger.warn('Failed to cleanup temp files', error);
            }
        }
    }

    private async saveWaveFile(filename: string, pcmData: Buffer, channels = 1, rate = 24000, sampleWidth = 2): Promise<void> {
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
