/**
 * Example: Stripe Payment Integration
 * This is a template showing how to implement a payment integration
 *
 * To use: Install stripe SDK and uncomment the implementation
 * npm install stripe
 */

import { BaseIntegration } from '../base/base-integration';
import {
    IntegrationMetadata,
    IntegrationConfigField,
    IntegrationCategory,
    ConfigFieldType,
    IPaymentIntegration,
    IntegrationResponse,
    IntegrationEvent,
    IntegrationConfig,
} from '../types/integration.interface';

export class StripePaymentIntegration extends BaseIntegration implements IPaymentIntegration {
    // private stripe: Stripe; // Uncomment when stripe is installed

    getMetadata(): IntegrationMetadata {
        return {
            id: 'stripe',
            name: 'Stripe',
            description: 'Accept payments with Stripe',
            version: '1.0.0',
            category: IntegrationCategory.PAYMENT,
            author: 'HakunaHook',
            website: 'https://stripe.com',
            documentation: 'https://stripe.com/docs',
            icon: 'https://stripe.com/favicon.ico',
            tags: ['payment', 'credit-card', 'subscription'],
        };
    }

    getConfigFields(): IntegrationConfigField[] {
        return [
            {
                key: 'apiKey',
                label: 'Secret API Key',
                type: ConfigFieldType.SECRET,
                required: true,
                description: 'Your Stripe secret key (starts with sk_)',
                placeholder: 'sk_test_...',
                validation: {
                    pattern: '^sk_(test|live)_[a-zA-Z0-9]+$',
                },
            },
            {
                key: 'webhookSecret',
                label: 'Webhook Secret',
                type: ConfigFieldType.SECRET,
                required: false,
                description: 'Webhook signing secret for verifying webhooks',
                placeholder: 'whsec_...',
            },
            {
                key: 'currency',
                label: 'Default Currency',
                type: ConfigFieldType.SELECT,
                required: true,
                defaultValue: 'usd',
                options: [
                    { label: 'USD', value: 'usd' },
                    { label: 'EUR', value: 'eur' },
                    { label: 'GBP', value: 'gbp' },
                    { label: 'INR', value: 'inr' },
                ],
            },
        ];
    }

    protected async onInitialize(config: IntegrationConfig): Promise<void> {
        // Initialize Stripe client
        // this.stripe = new Stripe(config.apiKey, {
        //     apiVersion: '2023-10-16',
        // });

        this.logger.log('Stripe integration initialized (mock)');
    }

    async createPayment(params: {
        amount: number;
        currency: string;
        metadata?: Record<string, any>;
    }): Promise<IntegrationResponse<{ paymentId: string; clientSecret?: string }>> {
        this.ensureActive();

        try {
            // Mock implementation
            // const paymentIntent = await this.stripe.paymentIntents.create({
            //     amount: params.amount,
            //     currency: params.currency,
            //     metadata: params.metadata,
            // });

            // return {
            //     success: true,
            //     data: {
            //         paymentId: paymentIntent.id,
            //         clientSecret: paymentIntent.client_secret,
            //     },
            // };

            this.logger.log(`Creating payment: ${params.amount} ${params.currency}`);
            return {
                success: true,
                data: {
                    paymentId: 'pi_mock_' + Date.now(),
                    clientSecret: 'pi_mock_secret',
                },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'PAYMENT_CREATION_FAILED',
                    message: error.message,
                },
            };
        }
    }

    async capturePayment(paymentId: string): Promise<IntegrationResponse> {
        this.ensureActive();

        try {
            // const paymentIntent = await this.stripe.paymentIntents.capture(paymentId);

            this.logger.log(`Capturing payment: ${paymentId}`);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'PAYMENT_CAPTURE_FAILED',
                    message: error.message,
                },
            };
        }
    }

    async refundPayment(paymentId: string, amount?: number): Promise<IntegrationResponse> {
        this.ensureActive();

        try {
            // const refund = await this.stripe.refunds.create({
            //     payment_intent: paymentId,
            //     amount,
            // });

            this.logger.log(`Refunding payment: ${paymentId}`);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'REFUND_FAILED',
                    message: error.message,
                },
            };
        }
    }

    async getPaymentStatus(paymentId: string): Promise<IntegrationResponse<{ status: string }>> {
        this.ensureActive();

        try {
            // const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

            return {
                success: true,
                data: {
                    status: 'succeeded', // paymentIntent.status
                },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'PAYMENT_STATUS_FAILED',
                    message: error.message,
                },
            };
        }
    }

    async handleWebhook(payload: any, signature?: string): Promise<IntegrationEvent> {
        this.ensureActive();

        // Verify webhook signature
        // const webhookSecret = this.getConfig<string>('webhookSecret');
        // if (webhookSecret && signature) {
        //     const event = this.stripe.webhooks.constructEvent(
        //         payload,
        //         signature,
        //         webhookSecret
        //     );
        //     return {
        //         type: event.type,
        //         data: event.data.object,
        //         timestamp: new Date(event.created * 1000),
        //     };
        // }

        return {
            type: 'payment.webhook',
            data: payload,
            timestamp: new Date(),
        };
    }
}
