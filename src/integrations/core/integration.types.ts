/**
 * Status of an integration
 */
export enum IntegrationStatus {
    UNINITIALIZED = 'uninitialized',
    INITIALIZING = 'initializing',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    ERROR = 'error',
}

/**
 * Metadata about an integration
 */
export interface IntegrationMetadata {
    name: string;
    version: string;
    enabled: boolean;
    status: IntegrationStatus;
    lastHealthCheck?: Date;
    error?: string;
}

/**
 * Result type for integration operations
 */
export interface IntegrationResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
}

/**
 * Options for integration operations
 */
export interface IntegrationOptions {
    timeout?: number;
    retries?: number;
    throwOnError?: boolean;
}
