/**
 * Integration Registry Service
 * Manages registration, initialization, and lifecycle of all integrations
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IIntegration, IntegrationMetadata, IntegrationConfig, IntegrationStatus } from './types/integration.interface';

interface RegisteredIntegration {
    instance: IIntegration;
    metadata: IntegrationMetadata;
    config?: IntegrationConfig;
    enabled: boolean;
}

@Injectable()
export class IntegrationRegistryService implements OnModuleInit {
    private readonly logger = new Logger(IntegrationRegistryService.name);
    private readonly integrations = new Map<string, RegisteredIntegration>();

    async onModuleInit() {
        this.logger.log('Integration Registry initialized');
    }

    /**
     * Register a new integration
     */
    register(integration: IIntegration): void {
        const metadata = integration.getMetadata();

        if (this.integrations.has(metadata.id)) {
            this.logger.warn(`Integration ${metadata.id} is already registered. Skipping.`);
            return;
        }

        this.integrations.set(metadata.id, {
            instance: integration,
            metadata,
            enabled: false,
        });

        this.logger.log(`Registered integration: ${metadata.name} (${metadata.id})`);
    }

    /**
     * Enable and initialize an integration with configuration
     */
    async enable(integrationId: string, config: IntegrationConfig): Promise<void> {
        const registered = this.integrations.get(integrationId);

        if (!registered) {
            throw new Error(`Integration ${integrationId} not found`);
        }

        try {
            await registered.instance.initialize(config);
            registered.config = config;
            registered.enabled = true;

            this.logger.log(`Enabled integration: ${registered.metadata.name}`);
        } catch (error) {
            this.logger.error(`Failed to enable integration ${integrationId}:`, error);
            throw error;
        }
    }

    /**
     * Disable an integration
     */
    async disable(integrationId: string): Promise<void> {
        const registered = this.integrations.get(integrationId);

        if (!registered) {
            throw new Error(`Integration ${integrationId} not found`);
        }

        try {
            await registered.instance.destroy();
            registered.enabled = false;
            registered.config = undefined;

            this.logger.log(`Disabled integration: ${registered.metadata.name}`);
        } catch (error) {
            this.logger.error(`Failed to disable integration ${integrationId}:`, error);
            throw error;
        }
    }

    /**
     * Get an integration instance
     */
    get<T extends IIntegration = IIntegration>(integrationId: string): T | null {
        const registered = this.integrations.get(integrationId);

        if (!registered || !registered.enabled) {
            return null;
        }

        return registered.instance as T;
    }

    /**
     * Get integration by category
     */
    getByCategory(category: string): IIntegration[] {
        const results: IIntegration[] = [];

        for (const registered of this.integrations.values()) {
            if (registered.enabled && registered.metadata.category === category) {
                results.push(registered.instance);
            }
        }

        return results;
    }

    /**
     * Check if integration is enabled
     */
    isEnabled(integrationId: string): boolean {
        const registered = this.integrations.get(integrationId);
        return registered?.enabled ?? false;
    }

    /**
     * Get all registered integrations
     */
    getAll(): Array<{
        id: string;
        metadata: IntegrationMetadata;
        enabled: boolean;
        status: IntegrationStatus;
    }> {
        const results: Array<{
            id: string;
            metadata: IntegrationMetadata;
            enabled: boolean;
            status: IntegrationStatus;
        }> = [];

        for (const [id, registered] of this.integrations.entries()) {
            results.push({
                id,
                metadata: registered.metadata,
                enabled: registered.enabled,
                status: registered.instance.getStatus(),
            });
        }

        return results;
    }

    /**
     * Get enabled integrations
     */
    getEnabled(): Array<{
        id: string;
        metadata: IntegrationMetadata;
        status: IntegrationStatus;
    }> {
        return this.getAll().filter((i) => i.enabled);
    }

    /**
     * Health check for all enabled integrations
     */
    async healthCheckAll(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const [id, registered] of this.integrations.entries()) {
            if (registered.enabled) {
                try {
                    results[id] = await registered.instance.healthCheck();
                } catch (error) {
                    this.logger.error(`Health check failed for ${id}:`, error);
                    results[id] = false;
                }
            }
        }

        return results;
    }

    /**
     * Cleanup all integrations on shutdown
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('Shutting down all integrations...');

        for (const [id, registered] of this.integrations.entries()) {
            if (registered.enabled) {
                try {
                    await registered.instance.destroy();
                    this.logger.log(`Shut down integration: ${id}`);
                } catch (error) {
                    this.logger.error(`Failed to shut down integration ${id}:`, error);
                }
            }
        }
    }
}
