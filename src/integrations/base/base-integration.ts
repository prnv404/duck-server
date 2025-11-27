/**
 * Base Integration Abstract Class
 * Provides common functionality for all integrations
 */

import { Logger } from '@nestjs/common';
import {
    IIntegration,
    IntegrationMetadata,
    IntegrationConfigField,
    IntegrationConfig,
    IntegrationStatus,
} from '../types/integration.interface';

export abstract class BaseIntegration implements IIntegration {
    protected logger: Logger;
    protected config: IntegrationConfig = {};
    protected status: IntegrationStatus = IntegrationStatus.INACTIVE;

    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    /**
     * Must be implemented by each integration
     */
    abstract getMetadata(): IntegrationMetadata;

    /**
     * Must be implemented by each integration
     */
    abstract getConfigFields(): IntegrationConfigField[];

    /**
     * Initialize the integration
     */
    async initialize(config: IntegrationConfig): Promise<void> {
        this.logger.log(`Initializing ${this.getMetadata().name}...`);
        this.status = IntegrationStatus.INITIALIZING;

        try {
            // Validate config
            const validation = await this.validateConfig(config);
            if (!validation.valid) {
                throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
            }

            this.config = config;

            // Call custom initialization logic
            await this.onInitialize(config);

            this.status = IntegrationStatus.ACTIVE;
            this.logger.log(`${this.getMetadata().name} initialized successfully`);
        } catch (error) {
            this.status = IntegrationStatus.ERROR;
            this.logger.error(`Failed to initialize ${this.getMetadata().name}:`, error);
            throw error;
        }
    }

    /**
     * Custom initialization logic - override in subclass
     */
    protected async onInitialize(config: IntegrationConfig): Promise<void> {
        // Override in subclass
    }

    /**
     * Validate configuration
     */
    async validateConfig(config: IntegrationConfig): Promise<{ valid: boolean; errors?: string[] }> {
        const errors: string[] = [];
        const fields = this.getConfigFields();

        for (const field of fields) {
            const value = config[field.key];

            // Check required fields
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field.label} is required`);
                continue;
            }

            // Skip validation if field is not required and empty
            if (!field.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type validation
            if (field.type === 'number' && typeof value !== 'number') {
                errors.push(`${field.label} must be a number`);
            }

            if (field.type === 'boolean' && typeof value !== 'boolean') {
                errors.push(`${field.label} must be a boolean`);
            }

            // Custom validation
            if (field.validation) {
                if (field.validation.min !== undefined && value < field.validation.min) {
                    errors.push(`${field.label} must be at least ${field.validation.min}`);
                }

                if (field.validation.max !== undefined && value > field.validation.max) {
                    errors.push(`${field.label} must be at most ${field.validation.max}`);
                }

                if (field.validation.pattern && typeof value === 'string') {
                    const regex = new RegExp(field.validation.pattern);
                    if (!regex.test(value)) {
                        errors.push(`${field.label} format is invalid`);
                    }
                }

                if (field.validation.custom) {
                    const result = field.validation.custom(value);
                    if (result !== true) {
                        errors.push(typeof result === 'string' ? result : `${field.label} validation failed`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    /**
     * Health check - override in subclass for custom logic
     */
    async healthCheck(): Promise<boolean> {
        return this.status === IntegrationStatus.ACTIVE;
    }

    /**
     * Get current status
     */
    getStatus(): IntegrationStatus {
        return this.status;
    }

    /**
     * Cleanup - override in subclass for custom logic
     */
    async destroy(): Promise<void> {
        this.logger.log(`Destroying ${this.getMetadata().name}...`);
        this.status = IntegrationStatus.INACTIVE;
        this.config = {};
    }

    /**
     * Get configuration value
     */
    protected getConfig<T = any>(key: string, defaultValue?: T): T {
        return this.config[key] ?? defaultValue;
    }

    /**
     * Check if integration is active
     */
    protected isActive(): boolean {
        return this.status === IntegrationStatus.ACTIVE;
    }

    /**
     * Ensure integration is active before operation
     */
    protected ensureActive(): void {
        if (!this.isActive()) {
            throw new Error(`${this.getMetadata().name} is not active. Current status: ${this.status}`);
        }
    }
}
