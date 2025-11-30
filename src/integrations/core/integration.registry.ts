import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BaseIntegration } from './base-integration.interface';
import { IntegrationMetadata, IntegrationStatus } from './integration.types';
import { IntegrationRegistrationOptions } from './integration-config.interface';

/**
 * Central registry for managing all integrations in the system.
 * Provides registration, retrieval, lifecycle management, and health monitoring.
 */
@Injectable()
export class IntegrationRegistry implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(IntegrationRegistry.name);
    private readonly integrations = new Map<string, BaseIntegration>();
    private readonly metadata = new Map<string, IntegrationMetadata>();

    /**
     * Initialize all registered integrations on module startup
     */
    async onModuleInit() {
        this.logger.log('Initializing integrations...');
        const integrationNames = Array.from(this.integrations.keys());

        for (const name of integrationNames) {
            const integration = this.integrations.get(name);
            if (integration && integration.enabled) {
                try {
                    await this.initializeIntegration(name);
                } catch (error) {
                    this.logger.error(`Failed to initialize integration "${name}": ${error.message}`, error.stack);
                }
            }
        }
    }

    /**
     * Disconnect all integrations on module shutdown
     */
    async onModuleDestroy() {
        this.logger.log('Shutting down integrations...');
        const integrationNames = Array.from(this.integrations.keys());

        for (const name of integrationNames) {
            try {
                await this.disconnectIntegration(name);
            } catch (error) {
                this.logger.error(`Failed to disconnect integration "${name}": ${error.message}`, error.stack);
            }
        }
    }

    /**
     * Register a new integration
     *
     * @param integration - The integration instance to register
     * @param options - Optional registration options
     */
    async register(integration: BaseIntegration, options?: IntegrationRegistrationOptions): Promise<void> {
        const name = options?.nameOverride || integration.name;

        if (this.integrations.has(name)) {
            throw new Error(`Integration "${name}" is already registered`);
        }

        this.integrations.set(name, integration);
        this.metadata.set(name, {
            name,
            version: integration.version,
            enabled: integration.enabled,
            status: IntegrationStatus.UNINITIALIZED,
        });

        this.logger.log(`Registered integration: ${name} (v${integration.version})`);

        // Auto-initialize if requested
        if (options?.autoInitialize && integration.enabled) {
            await this.initializeIntegration(name);

            // Auto-connect if requested
            if (options?.autoConnect) {
                await this.connectIntegration(name);
            }
        }
    }

    /**
     * Get an integration by name with type safety
     *
     * @param name - Name of the integration
     * @returns The integration instance
     * @throws Error if integration is not found or not enabled
     */
    get<T extends BaseIntegration>(name: string): T {
        const integration = this.integrations.get(name);

        if (!integration) {
            throw new Error(`Integration "${name}" not found`);
        }

        if (!integration.enabled) {
            throw new Error(`Integration "${name}" is disabled`);
        }

        return integration as T;
    }

    /**
     * Get an integration if available, or return undefined
     *
     * @param name - Name of the integration
     * @returns The integration instance or undefined
     */
    getOptional<T extends BaseIntegration>(name: string): T | undefined {
        const integration = this.integrations.get(name);
        return integration?.enabled ? (integration as T) : undefined;
    }

    /**
     * Check if an integration is available
     *
     * @param name - Name of the integration
     * @returns True if integration exists and is enabled
     */
    has(name: string): boolean {
        const integration = this.integrations.get(name);
        return integration ? integration.enabled : false;
    }

    /**
     * List all registered integrations
     *
     * @returns Array of integration metadata
     */
    list(): IntegrationMetadata[] {
        return Array.from(this.metadata.values());
    }

    /**
     * Get metadata for a specific integration
     *
     * @param name - Name of the integration
     * @returns Integration metadata or undefined
     */
    getMetadata(name: string): IntegrationMetadata | undefined {
        return this.metadata.get(name);
    }

    /**
     * Initialize a specific integration
     *
     * @param name - Name of the integration
     */
    private async initializeIntegration(name: string): Promise<void> {
        const integration = this.integrations.get(name);
        if (!integration) return;

        const metadata = this.metadata.get(name);
        if (!metadata) return;

        try {
            metadata.status = IntegrationStatus.INITIALIZING;
            this.logger.log(`Initializing integration: ${name}`);

            await integration.initialize(integration.config);
            await integration.connect();

            metadata.status = IntegrationStatus.CONNECTED;
            this.logger.log(`Integration "${name}" initialized successfully`);
        } catch (error) {
            metadata.status = IntegrationStatus.ERROR;
            metadata.error = error.message;
            throw error;
        }
    }

    /**
     * Connect a specific integration
     *
     * @param name - Name of the integration
     */
    private async connectIntegration(name: string): Promise<void> {
        const integration = this.integrations.get(name);
        if (!integration) return;

        const metadata = this.metadata.get(name);
        if (!metadata) return;

        try {
            this.logger.log(`Connecting integration: ${name}`);
            await integration.connect();
            metadata.status = IntegrationStatus.CONNECTED;
        } catch (error) {
            metadata.status = IntegrationStatus.ERROR;
            metadata.error = error.message;
            throw error;
        }
    }

    /**
     * Disconnect a specific integration
     *
     * @param name - Name of the integration
     */
    private async disconnectIntegration(name: string): Promise<void> {
        const integration = this.integrations.get(name);
        if (!integration) return;

        const metadata = this.metadata.get(name);
        if (!metadata) return;

        try {
            this.logger.log(`Disconnecting integration: ${name}`);
            await integration.disconnect();
            metadata.status = IntegrationStatus.DISCONNECTED;
        } catch (error) {
            metadata.status = IntegrationStatus.ERROR;
            metadata.error = error.message;
            this.logger.error(`Failed to disconnect integration "${name}": ${error.message}`);
        }
    }

    /**
     * Perform health check on a specific integration
     *
     * @param name - Name of the integration
     * @returns Health check result
     */
    async healthCheck(name: string) {
        const integration = this.integrations.get(name);
        if (!integration) {
            throw new Error(`Integration "${name}" not found`);
        }

        const metadata = this.metadata.get(name);
        if (!metadata) {
            throw new Error(`Metadata for integration "${name}" not found`);
        }

        try {
            const result = await integration.healthCheck();
            metadata.lastHealthCheck = new Date();
            return result;
        } catch (error) {
            metadata.lastHealthCheck = new Date();
            return {
                healthy: false,
                message: error.message,
            };
        }
    }

    /**
     * Perform health check on all integrations
     *
     * @returns Map of integration names to health check results
     */
    async healthCheckAll(): Promise<Map<string, any>> {
        const results = new Map();

        for (const name of this.integrations.keys()) {
            try {
                const result = await this.healthCheck(name);
                results.set(name, result);
            } catch (error) {
                results.set(name, {
                    healthy: false,
                    message: error.message,
                });
            }
        }

        return results;
    }
}
