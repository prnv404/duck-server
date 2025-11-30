/**
 * Base interface that all integrations must implement.
 * Provides a contract for lifecycle management and health monitoring.
 *
 * @template TConfig - The configuration type for this integration
 */
export interface BaseIntegration<TConfig = any> {
    /**
     * Unique identifier for this integration
     */
    readonly name: string;

    /**
     * Version of the integration
     */
    readonly version: string;

    /**
     * Whether this integration is currently enabled
     */
    readonly enabled: boolean;

    /**
     * Configuration for this integration
     */
    readonly config: TConfig;

    /**
     * Initialize the integration with provided configuration.
     * Called once when the integration is registered.
     *
     * @param config - Configuration object for the integration
     */
    initialize(config: TConfig): Promise<void>;

    /**
     * Establish connection or perform any necessary setup.
     * Called after initialization.
     */
    connect(): Promise<void>;

    /**
     * Disconnect or cleanup resources.
     * Called on application shutdown.
     */
    disconnect(): Promise<void>;

    /**
     * Check if the integration is healthy and operational.
     *
     * @returns Object with health status and optional message
     */
    healthCheck(): Promise<{
        healthy: boolean;
        message?: string;
        details?: any;
    }>;
}
