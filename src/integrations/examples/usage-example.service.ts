/**
 * Usage Example Service
 * Demonstrates how to use the integration system in your services
 */

import { Injectable, Logger } from '@nestjs/common';
import { IntegrationRegistryService } from '../integration-registry.service';
import { IPaymentIntegration, INotificationIntegration, ITelemetryIntegration } from '../types/integration.interface';

@Injectable()
export class UsageExampleService {
    private readonly logger = new Logger(UsageExampleService.name);

    constructor(private readonly integrationRegistry: IntegrationRegistryService) {}

    /**
     * Example: Process a payment with integrated notifications and tracking
     */
    async processOrder(orderData: { amount: number; currency: string; userId: string; items: any[] }) {
        try {
            // 1. Process payment using payment integration
            const payment = this.integrationRegistry.get<IPaymentIntegration>('stripe');

            if (!payment) {
                throw new Error('Payment integration not enabled');
            }

            const paymentResult = await payment.createPayment({
                amount: orderData.amount,
                currency: orderData.currency,
                metadata: {
                    userId: orderData.userId,
                    items: orderData.items.length,
                },
            });

            if (!paymentResult.success) {
                throw new Error(`Payment failed: ${paymentResult.error?.message}`);
            }

            // 2. Send notification to Slack
            const slack = this.integrationRegistry.get<INotificationIntegration>('slack');

            if (slack) {
                await slack.send({
                    recipient: '#orders',
                    subject: 'New Order Received',
                    message: `Order for $${orderData.amount} ${orderData.currency} from user ${orderData.userId}`,
                    priority: orderData.amount > 1000 ? 'high' : 'normal',
                });
            }

            // 3. Track event in telemetry system
            const telemetry = this.integrationRegistry.get<ITelemetryIntegration>('datadog');

            if (telemetry) {
                await telemetry.trackEvent({
                    event: 'order.completed',
                    userId: orderData.userId,
                    properties: {
                        amount: orderData.amount,
                        currency: orderData.currency,
                        paymentId: paymentResult.data?.paymentId,
                        itemCount: orderData.items.length,
                    },
                });

                // Track revenue metric
                await telemetry.trackMetric({
                    name: 'revenue',
                    value: orderData.amount,
                    unit: orderData.currency,
                    tags: {
                        source: 'order',
                        userId: orderData.userId,
                    },
                });
            }

            return {
                success: true,
                orderId: Date.now().toString(),
                paymentId: paymentResult.data?.paymentId,
            };
        } catch (error) {
            this.logger.error('Order processing failed:', error);

            // Send error notification
            const slack = this.integrationRegistry.get<INotificationIntegration>('slack');
            if (slack) {
                await slack.send({
                    recipient: '#alerts',
                    subject: 'Order Processing Failed',
                    message: `Failed to process order: ${error.message}`,
                    priority: 'high',
                });
            }

            throw error;
        }
    }

    /**
     * Example: Send bulk notifications to multiple channels
     */
    async sendBulkNotifications(message: string, channels: string[]) {
        const slack = this.integrationRegistry.get<INotificationIntegration>('slack');

        if (!slack) {
            this.logger.warn('Slack integration not enabled');
            return;
        }

        const notifications = channels.map((channel) => ({
            recipient: channel,
            message,
        }));

        const result = await slack.sendBulk(notifications);

        if (result.success) {
            this.logger.log(`Sent ${result.data?.messageIds.length} notifications`);
        } else {
            this.logger.error('Bulk notification failed:', result.error);
        }

        return result;
    }

    /**
     * Example: Get all enabled integrations
     */
    async getIntegrationStatus() {
        const allIntegrations = this.integrationRegistry.getAll();
        const healthStatus = await this.integrationRegistry.healthCheckAll();

        return allIntegrations.map((integration) => ({
            id: integration.id,
            name: integration.metadata.name,
            category: integration.metadata.category,
            enabled: integration.enabled,
            status: integration.status,
            healthy: healthStatus[integration.id] ?? false,
        }));
    }

    /**
     * Example: Enable an integration dynamically
     */
    async enableIntegration(integrationId: string, config: Record<string, any>) {
        try {
            await this.integrationRegistry.enable(integrationId, config);
            this.logger.log(`Enabled integration: ${integrationId}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to enable integration ${integrationId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Example: Disable an integration
     */
    async disableIntegration(integrationId: string) {
        try {
            await this.integrationRegistry.disable(integrationId);
            this.logger.log(`Disabled integration: ${integrationId}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to disable integration ${integrationId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Example: Get integrations by category
     */
    getPaymentIntegrations() {
        return this.integrationRegistry.getByCategory('payment');
    }

    getNotificationIntegrations() {
        return this.integrationRegistry.getByCategory('notification');
    }

    getTelemetryIntegrations() {
        return this.integrationRegistry.getByCategory('telemetry');
    }
}
