import { BaseIntegration } from '../../core/base-integration.interface';
import { BaseIntegrationConfig } from '../../core/integration-config.interface';
import { createClient } from '@supabase/supabase-js';

export interface StorageIntegrationConfig extends BaseIntegrationConfig {
    bucket: string;
    supabaseUrl: string;
    supabaseKey: string;
}

export class StorageIntegration implements BaseIntegration<StorageIntegrationConfig> {
    readonly name = 'storage';
    readonly version = '1.0.0';

    private _config: StorageIntegrationConfig;
    private _connected = false;
    private _supabase?: ReturnType<typeof createClient>;

    constructor(input: { bucket: string; supabaseUrl: string; supabaseKey: string }) {
        this._config = {
            enabled: false,
            bucket: 'audio',
            supabaseUrl: input.supabaseUrl,
            supabaseKey: input.supabaseKey,
        };
    }

    get config(): StorageIntegrationConfig {
        return this._config;
    }

    get enabled(): boolean {
        return true;
    }

    async initialize(config: StorageIntegrationConfig): Promise<void> {
        this._config = config;
        console.log('[StorageIntegration] Initialized with Supabase storage');
    }

    async connect(): Promise<void> {
        if (!this.enabled) return;

        const { supabaseUrl, supabaseKey } = this._config;

        console.log('[StorageIntegration] Connecting to Supabase storage...');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('supabaseUrl and supabaseKey are required for Supabase provider');
        }

        this._supabase = createClient(supabaseUrl, supabaseKey);
        this._connected = true;
        console.log('[StorageIntegration] Connected');
    }

    async disconnect(): Promise<void> {
        this._connected = false;
        this._supabase = undefined;
        console.log('[StorageIntegration] Disconnected');
    }

    async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
        if (this._supabase) {
            try {
                // Simple health check: try to get bucket info
                const { data, error } = await this._supabase.storage.from(this.config.bucket).list();
                if (error) {
                    return { healthy: false, message: `Storage health check failed: ${error.message}` };
                }
                return { healthy: true, message: 'Supabase storage reachable' };
            } catch (err) {
                return { healthy: false, message: `Health check error: ${err}` };
            }
        }
        return {
            healthy: this._connected,
            message: this._connected ? 'Storage service reachable' : 'Not connected',
        };
    }

    // Integration-specific methods

    async uploadFile(path: string, content: any): Promise<string> {
        if (!this._connected) throw new Error('Storage not connected');
        if (!this._supabase) {
            throw new Error('Supabase client not initialized');
        }

        let size = 'unknown';
        if (Buffer.isBuffer(content)) {
            size = `${content.length} bytes`;
        } else if (typeof content === 'string') {
            size = `${content.length} chars`;
        }

        console.log(`[StorageIntegration] Uploading file to ${path} (Size: ${size})`);

        const { data, error } = await this._supabase.storage.from(this._config.bucket).upload(path, content, {
            upsert: true, // Overwrite if exists
            contentType: 'audio/mpeg',
        });
        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
        console.log('[StorageIntegration] File uploaded successfully');
        return data.fullPath;
    }

    async getFileUrl(path: string): Promise<string> {
        if (!this._supabase) {
            throw new Error('Supabase client not initialized');
        }
        const { data } = this._supabase.storage.from(this._config.bucket).getPublicUrl(path);
        return data.publicUrl;
    }
}
