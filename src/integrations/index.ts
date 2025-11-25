/**
 * Integration System Exports
 * Central export file for the integration system
 */

// Types and interfaces
export * from './types/integration.interface';

// Base class
export { BaseIntegration } from './base/base-integration';

// Registry service
export { IntegrationRegistryService } from './integration-registry.service';

// Module
export { IntegrationModule } from './integration.module';

// Example integrations (uncomment when ready to use)
// export { StripePaymentIntegration } from './examples/stripe-payment.integration';
// export { SlackNotificationIntegration } from './examples/slack-notification.integration';
// export { DatadogTelemetryIntegration } from './examples/datadog-telemetry.integration';
