/**
 * Base configuration interface for all integrations
 */
export interface BaseIntegrationConfig {
    /**
     * Whether this integration is enabled
     */
    enabled: boolean;

    /**
     * Optional timeout for operations (in milliseconds)
     */
    timeout?: number;

    /**
     * Optional retry configuration
     */
    retry?: {
        attempts: number;
        delay: number;
    };

    /**
     * Additional metadata
     */
    metadata?: Record<string, any>;
}

/**
 * Options for registering an integration
 */
export interface IntegrationRegistrationOptions {
    /**
     * Whether to auto-initialize the integration on registration
     */
    autoInitialize?: boolean;

    /**
     * Whether to auto-connect after initialization
     */
    autoConnect?: boolean;

    /**
     * Override the integration name
     */
    nameOverride?: string;
}
