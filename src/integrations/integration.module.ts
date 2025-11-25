/**
 * Integration Module
 * Main module for the integration system
 */

import { Module, Global } from '@nestjs/common';
import { IntegrationRegistryService } from './integration-registry.service';

// Import example integrations (uncomment when ready to use)
// import { StripePaymentIntegration } from './examples/stripe-payment.integration';
// import { SlackNotificationIntegration } from './examples/slack-notification.integration';
// import { DatadogTelemetryIntegration } from './examples/datadog-telemetry.integration';

@Global()
@Module({
    providers: [
        IntegrationRegistryService,
        // Register your integrations here
        // {
        //     provide: 'INTEGRATIONS',
        //     useFactory: (registry: IntegrationRegistryService) => {
        //         // Auto-register integrations on startup
        //         registry.register(new StripePaymentIntegration());
        //         registry.register(new SlackNotificationIntegration());
        //         registry.register(new DatadogTelemetryIntegration());
        //         return registry;
        //     },
        //     inject: [IntegrationRegistryService],
        // },
    ],
    exports: [IntegrationRegistryService],
})
export class IntegrationModule {}
