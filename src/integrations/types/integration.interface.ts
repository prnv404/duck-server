/**
 * Integration System Types
 * Base interfaces for all third-party integrations
 */

/**
 * Integration categories
 */
export enum IntegrationCategory {
    PAYMENT = 'payment',
    NOTIFICATION = 'notification',
    TELEMETRY = 'telemetry',
    ANALYTICS = 'analytics',
    STORAGE = 'storage',
    EMAIL = 'email',
    SMS = 'sms',
    LOGGING = 'logging',
    MONITORING = 'monitoring',
    OTHER = 'other',
}

/**
 * Integration status
 */
export enum IntegrationStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ERROR = 'error',
    INITIALIZING = 'initializing',
}

/**
 * Configuration field types for dynamic forms
 */
export enum ConfigFieldType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    SECRET = 'secret', // For API keys, passwords
    SELECT = 'select',
    MULTISELECT = 'multiselect',
    JSON = 'json',
}

/**
 * Configuration field definition
 */
export interface IntegrationConfigField {
    key: string;
    label: string;
    type: ConfigFieldType;
    required: boolean;
    description?: string;
    placeholder?: string;
    defaultValue?: any;
    options?: Array<{ label: string; value: string | number }>;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        custom?: (value: any) => boolean | string;
    };
}

/**
 * Integration metadata
 */
export interface IntegrationMetadata {
    id: string; // Unique identifier (e.g., 'stripe', 'sendgrid')
    name: string; // Display name
    description: string;
    version: string;
    category: IntegrationCategory;
    author?: string;
    website?: string;
    documentation?: string;
    icon?: string; // URL or base64
    tags?: string[];
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
    [key: string]: any;
}

/**
 * Integration event data
 */
export interface IntegrationEvent<T = any> {
    type: string;
    data: T;
    timestamp: Date;
    metadata?: Record<string, any>;
}

/**
 * Integration response
 */
export interface IntegrationResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: Record<string, any>;
}

/**
 * Base Integration Interface
 * All integrations must implement this interface
 */
export interface IIntegration {
    /**
     * Get integration metadata
     */
    getMetadata(): IntegrationMetadata;

    /**
     * Get configuration fields for this integration
     */
    getConfigFields(): IntegrationConfigField[];

    /**
     * Initialize the integration with configuration
     */
    initialize(config: IntegrationConfig): Promise<void>;

    /**
     * Check if integration is healthy/connected
     */
    healthCheck(): Promise<boolean>;

    /**
     * Get current status
     */
    getStatus(): IntegrationStatus;

    /**
     * Validate configuration before initialization
     */
    validateConfig(config: IntegrationConfig): Promise<{ valid: boolean; errors?: string[] }>;

    /**
     * Cleanup/disconnect when integration is disabled
     */
    destroy(): Promise<void>;
}

/**
 * Payment Integration Interface
 */
export interface IPaymentIntegration extends IIntegration {
    /**
     * Create a payment intent/session
     */
    createPayment(params: {
        amount: number;
        currency: string;
        metadata?: Record<string, any>;
    }): Promise<IntegrationResponse<{ paymentId: string; clientSecret?: string }>>;

    /**
     * Capture/confirm a payment
     */
    capturePayment(paymentId: string): Promise<IntegrationResponse>;

    /**
     * Refund a payment
     */
    refundPayment(paymentId: string, amount?: number): Promise<IntegrationResponse>;

    /**
     * Get payment status
     */
    getPaymentStatus(paymentId: string): Promise<IntegrationResponse<{ status: string }>>;

    /**
     * Handle webhook from payment provider
     */
    handleWebhook(payload: any, signature?: string): Promise<IntegrationEvent>;
}

/**
 * Notification Integration Interface
 */
export interface INotificationIntegration extends IIntegration {
    /**
     * Send a notification
     */
    send(params: {
        recipient: string | string[];
        subject?: string;
        message: string;
        priority?: 'low' | 'normal' | 'high';
        metadata?: Record<string, any>;
    }): Promise<IntegrationResponse<{ messageId: string }>>;

    /**
     * Send bulk notifications
     */
    sendBulk(
        notifications: Array<{
            recipient: string;
            message: string;
            metadata?: Record<string, any>;
        }>,
    ): Promise<IntegrationResponse<{ messageIds: string[] }>>;
}

/**
 * Telemetry/Analytics Integration Interface
 */
export interface ITelemetryIntegration extends IIntegration {
    /**
     * Track an event
     */
    trackEvent(params: { event: string; userId?: string; properties?: Record<string, any>; timestamp?: Date }): Promise<IntegrationResponse>;

    /**
     * Track a metric
     */
    trackMetric(params: {
        name: string;
        value: number;
        unit?: string;
        tags?: Record<string, string>;
        timestamp?: Date;
    }): Promise<IntegrationResponse>;

    /**
     * Set user properties
     */
    identifyUser(params: { userId: string; properties: Record<string, any> }): Promise<IntegrationResponse>;
}

/**
 * Storage Integration Interface
 */
export interface IStorageIntegration extends IIntegration {
    /**
     * Upload a file
     */
    upload(params: {
        file: Buffer | string;
        filename: string;
        contentType?: string;
        metadata?: Record<string, any>;
    }): Promise<IntegrationResponse<{ url: string; key: string }>>;

    /**
     * Download a file
     */
    download(key: string): Promise<IntegrationResponse<{ data: Buffer; contentType: string }>>;

    /**
     * Delete a file
     */
    delete(key: string): Promise<IntegrationResponse>;

    /**
     * Get signed URL for temporary access
     */
    getSignedUrl(key: string, expiresIn?: number): Promise<IntegrationResponse<{ url: string }>>;
}
