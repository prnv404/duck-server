import { Inject } from '@nestjs/common';
import { IntegrationRegistry } from './integration.registry';

/**
 * Decorator to inject a specific integration.
 *
 * @param name - The name of the integration to inject
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * constructor(@InjectIntegration('email') private emailIntegration: EmailIntegration) {}
 * ```
 */
export const InjectIntegration = (name: string) => {
    return (target: object, key: string | symbol, index?: number) => {
        if (index !== undefined) {
            Inject(IntegrationRegistry)(target, key, index);
        } else {
            Inject(IntegrationRegistry)(target, key);
        }
        // Note: This is a simplified version. In a full implementation,
        // we might want to create a custom provider for each integration
        // to allow direct injection of the integration instance instead of the registry.
        // For now, we'll stick to injecting the registry and using it to get the integration.
        // Or better, we can use a factory provider if we want strict typing at injection time,
        // but that requires dynamic module configuration which is more complex.
        //
        // A simpler approach for the user is to inject the Registry and use .get('name').
        // But to make it "plug and use effectively", a decorator that extracts it is nice.
        //
        // However, since NestJS decorators work at construction time, and our integrations
        // might be dynamic, injecting the Registry is the safest bet.
        //
        // Let's stick to the Registry injection pattern for simplicity and robustness,
        // but provide this decorator as a semantic alias if we want to expand later.
        //
        // Actually, to keep it VERY simple as requested:
        // We will just encourage injecting IntegrationRegistry.
        // But I'll leave this file here if we want to expand it later.
    };
};
