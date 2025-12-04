import { Global, Module } from '@nestjs/common';
import { IntegrationRegistry } from './core/integration.registry';
import { StorageIntegration } from './providers/storage/storage.integration';
import { GeminiIntegration } from './providers/gemini/gemini.integration';
import { EnvService } from '@/config/env/config.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [IntegrationRegistry, EnvService],
    exports: [IntegrationRegistry],
})
export class IntegrationModule {
    constructor(
        private registry: IntegrationRegistry,
        private config: EnvService,
    ) {}

    async onModuleInit() {
        await this.registry.register(
            new StorageIntegration({
                bucket: this.config.get('STORAGE_BUCKET'),
                supabaseUrl: this.config.get('SUPABASE_URL'),
                supabaseKey: this.config.get('SUPABASE_KEY'),
            }),
            {
                autoInitialize: true,
                autoConnect: true,
                nameOverride: 'storage',
            },
        );
        await this.registry.register(new GeminiIntegration(), {
            autoInitialize: true,
            autoConnect: true,
            nameOverride: 'gemini',
        });
    }
}
