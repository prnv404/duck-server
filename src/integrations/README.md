# Integration System

A flexible, plug-and-play integration system for third-party services like payments, notifications, telemetry, and more.

## Architecture

```
integrations/
├── types/
│   └── integration.interface.ts    # Base interfaces and types
├── base/
│   └── base-integration.ts         # Abstract base class
├── examples/                        # Example implementations
│   ├── stripe-payment.integration.ts
│   ├── slack-notification.integration.ts
│   └── datadog-telemetry.integration.ts
├── integration-registry.service.ts # Registry for managing integrations
└── integration.module.ts           # NestJS module
```

## Features

- ✅ **Type-safe** - Full TypeScript support with interfaces
- ✅ **Plug-and-play** - Easy to add new integrations
- ✅ **Configuration validation** - Built-in config validation
- ✅ **Health checks** - Monitor integration status
- ✅ **Lifecycle management** - Initialize, enable, disable, destroy
- ✅ **Category-based** - Organize by payment, notification, telemetry, etc.
- ✅ **Dynamic forms** - Auto-generate config forms from field definitions

## Integration Categories

- **Payment** - Stripe, PayPal, Razorpay, etc.
- **Notification** - Slack, Discord, Telegram, etc.
- **Telemetry** - Datadog, New Relic, Sentry, etc.
- **Analytics** - Google Analytics, Mixpanel, Amplitude, etc.
- **Storage** - AWS S3, Google Cloud Storage, Azure Blob, etc.
- **Email** - SendGrid, Mailgun, AWS SES, etc.
- **SMS** - Twilio, Vonage, AWS SNS, etc.
- **Logging** - Logtail, Papertrail, Splunk, etc.
- **Monitoring** - Prometheus, Grafana, etc.

## Quick Start

### 1. Create a New Integration

```typescript
import { BaseIntegration } from '../base/base-integration';
import {
    IntegrationMetadata,
    IntegrationConfigField,
    IntegrationCategory,
    ConfigFieldType,
    IPaymentIntegration,
    IntegrationResponse,
} from '../types/integration.interface';

export class MyPaymentIntegration extends BaseIntegration implements IPaymentIntegration {
    // Define metadata
    getMetadata(): IntegrationMetadata {
        return {
            id: 'my-payment',
            name: 'My Payment Provider',
            description: 'Accept payments with My Payment Provider',
            version: '1.0.0',
            category: IntegrationCategory.PAYMENT,
            website: 'https://mypayment.com',
        };
    }

    // Define configuration fields
    getConfigFields(): IntegrationConfigField[] {
        return [
            {
                key: 'apiKey',
                label: 'API Key',
                type: ConfigFieldType.SECRET,
                required: true,
                description: 'Your API key',
            },
            {
                key: 'environment',
                label: 'Environment',
                type: ConfigFieldType.SELECT,
                required: true,
                options: [
                    { label: 'Sandbox', value: 'sandbox' },
                    { label: 'Production', value: 'production' },
                ],
            },
        ];
    }

    // Initialize with config
    protected async onInitialize(config: IntegrationConfig): Promise<void> {
        // Initialize your SDK/client here
        this.logger.log('Initializing...');
    }

    // Implement interface methods
    async createPayment(params: any): Promise<IntegrationResponse> {
        this.ensureActive(); // Ensure integration is active
        
        try {
            // Your implementation
            return { success: true, data: { paymentId: '123' } };
        } catch (error) {
            return {
                success: false,
                error: { code: 'ERROR', message: error.message },
            };
        }
    }

    // ... implement other required methods
}
```

### 2. Register the Integration

In `integration.module.ts`:

```typescript
import { MyPaymentIntegration } from './my-payment.integration';

@Module({
    providers: [
        IntegrationRegistryService,
        {
            provide: 'INTEGRATIONS',
            useFactory: (registry: IntegrationRegistryService) => {
                registry.register(new MyPaymentIntegration());
                return registry;
            },
            inject: [IntegrationRegistryService],
        },
    ],
    exports: [IntegrationRegistryService],
})
export class IntegrationModule {}
```

### 3. Use the Integration

```typescript
import { Injectable } from '@nestjs/common';
import { IntegrationRegistryService } from './integrations/integration-registry.service';
import { IPaymentIntegration } from './integrations/types/integration.interface';

@Injectable()
export class PaymentService {
    constructor(private readonly integrationRegistry: IntegrationRegistryService) {}

    async processPayment(amount: number) {
        // Get the payment integration
        const payment = this.integrationRegistry.get<IPaymentIntegration>('my-payment');
        
        if (!payment) {
            throw new Error('Payment integration not enabled');
        }

        // Use it
        const result = await payment.createPayment({
            amount,
            currency: 'usd',
        });

        return result;
    }
}
```

## Configuration Management

### Enable an Integration

```typescript
await integrationRegistry.enable('stripe', {
    apiKey: 'sk_test_...',
    webhookSecret: 'whsec_...',
    currency: 'usd',
});
```

### Disable an Integration

```typescript
await integrationRegistry.disable('stripe');
```

### Check Status

```typescript
const isEnabled = integrationRegistry.isEnabled('stripe');
const allIntegrations = integrationRegistry.getAll();
const enabledOnly = integrationRegistry.getEnabled();
```

### Health Check

```typescript
const healthStatus = await integrationRegistry.healthCheckAll();
// { stripe: true, slack: false, ... }
```

## Available Interfaces

### Base Interface (All integrations)
- `IIntegration` - Base interface with lifecycle methods

### Specialized Interfaces
- `IPaymentIntegration` - Payment processing
- `INotificationIntegration` - Send notifications
- `ITelemetryIntegration` - Track events and metrics
- `IStorageIntegration` - File storage operations

## Configuration Field Types

- `STRING` - Text input
- `NUMBER` - Numeric input
- `BOOLEAN` - Checkbox/toggle
- `SECRET` - Password/API key (masked)
- `SELECT` - Dropdown selection
- `MULTISELECT` - Multiple selection
- `JSON` - JSON editor

## Validation

Built-in validation supports:
- Required fields
- Type checking
- Min/max values
- Regex patterns
- Custom validation functions

Example:
```typescript
{
    key: 'apiKey',
    label: 'API Key',
    type: ConfigFieldType.SECRET,
    required: true,
    validation: {
        pattern: '^sk_[a-zA-Z0-9]+$',
        custom: (value) => {
            if (!value.startsWith('sk_')) {
                return 'API key must start with sk_';
            }
            return true;
        },
    },
}
```

## Best Practices

1. **Always extend `BaseIntegration`** - It provides common functionality
2. **Use `ensureActive()`** - Check integration is active before operations
3. **Handle errors gracefully** - Return `IntegrationResponse` with error details
4. **Implement health checks** - Override `healthCheck()` for custom logic
5. **Log operations** - Use `this.logger` for debugging
6. **Validate configs** - Use built-in validation or override `validateConfig()`
7. **Clean up resources** - Override `destroy()` to close connections

## Example: Using Multiple Integrations

```typescript
@Injectable()
export class OrderService {
    constructor(private readonly integrationRegistry: IntegrationRegistryService) {}

    async createOrder(orderData: any) {
        // Process payment
        const payment = this.integrationRegistry.get<IPaymentIntegration>('stripe');
        const paymentResult = await payment.createPayment({
            amount: orderData.total,
            currency: 'usd',
        });

        if (!paymentResult.success) {
            throw new Error('Payment failed');
        }

        // Send notification
        const slack = this.integrationRegistry.get<INotificationIntegration>('slack');
        await slack?.send({
            recipient: '#orders',
            message: `New order: $${orderData.total}`,
        });

        // Track event
        const telemetry = this.integrationRegistry.get<ITelemetryIntegration>('datadog');
        await telemetry?.trackEvent({
            event: 'order.created',
            properties: { amount: orderData.total },
        });

        return { orderId: '123', paymentId: paymentResult.data.paymentId };
    }
}
```

## Testing

Mock integrations for testing:

```typescript
class MockPaymentIntegration extends BaseIntegration implements IPaymentIntegration {
    getMetadata() {
        return { id: 'mock-payment', name: 'Mock', /* ... */ };
    }

    async createPayment() {
        return { success: true, data: { paymentId: 'test_123' } };
    }
    
    // ... implement other methods
}

// In tests
const registry = new IntegrationRegistryService();
registry.register(new MockPaymentIntegration());
await registry.enable('mock-payment', {});
```

## Adding to App Module

```typescript
import { IntegrationModule } from './integrations/integration.module';

@Module({
    imports: [
        IntegrationModule, // Add this
        // ... other modules
    ],
})
export class AppModule {}
```

## Next Steps

1. Install required SDKs for integrations you want to use
2. Uncomment example integrations in `integration.module.ts`
3. Create your own integrations following the examples
4. Enable integrations with your API keys
5. Use them in your services!
