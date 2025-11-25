/**
 * Example: Slack Notification Integration
 * This is a template showing how to implement a notification integration
 *
 * To use: Install @slack/web-api and uncomment the implementation
 * npm install @slack/web-api
 */

import { BaseIntegration } from '../base/base-integration';
import {
    IntegrationMetadata,
    IntegrationConfigField,
    IntegrationCategory,
    ConfigFieldType,
    INotificationIntegration,
    IntegrationResponse,
    IntegrationConfig,
} from '../types/integration.interface';

export class SlackNotificationIntegration extends BaseIntegration implements INotificationIntegration {
    // private client: WebClient; // Uncomment when @slack/web-api is installed

    getMetadata(): IntegrationMetadata {
        return {
            id: 'slack',
            name: 'Slack',
            description: 'Send notifications to Slack channels',
            version: '1.0.0',
            category: IntegrationCategory.NOTIFICATION,
            author: 'HakunaHook',
            website: 'https://slack.com',
            documentation: 'https://api.slack.com/docs',
            icon: 'https://slack.com/favicon.ico',
            tags: ['notification', 'messaging', 'team'],
        };
    }

    getConfigFields(): IntegrationConfigField[] {
        return [
            {
                key: 'botToken',
                label: 'Bot Token',
                type: ConfigFieldType.SECRET,
                required: true,
                description: 'Slack bot token (starts with xoxb-)',
                placeholder: 'xoxb-...',
                validation: {
                    pattern: '^xoxb-[a-zA-Z0-9-]+$',
                },
            },
            {
                key: 'defaultChannel',
                label: 'Default Channel',
                type: ConfigFieldType.STRING,
                required: true,
                description: 'Default channel to send notifications',
                placeholder: '#general',
            },
            {
                key: 'username',
                label: 'Bot Username',
                type: ConfigFieldType.STRING,
                required: false,
                defaultValue: 'HakunaHook Bot',
                description: 'Display name for the bot',
            },
            {
                key: 'iconEmoji',
                label: 'Bot Icon Emoji',
                type: ConfigFieldType.STRING,
                required: false,
                defaultValue: ':robot_face:',
                placeholder: ':robot_face:',
            },
        ];
    }

    protected async onInitialize(config: IntegrationConfig): Promise<void> {
        // Initialize Slack client
        // this.client = new WebClient(config.botToken);

        // Test connection
        // await this.client.auth.test();

        this.logger.log('Slack integration initialized (mock)');
    }

    async send(params: {
        recipient: string | string[];
        subject?: string;
        message: string;
        priority?: 'low' | 'normal' | 'high';
        metadata?: Record<string, any>;
    }): Promise<IntegrationResponse<{ messageId: string }>> {
        this.ensureActive();

        try {
            const channel = Array.isArray(params.recipient) ? params.recipient[0] : params.recipient;
            const username = this.getConfig<string>('username');
            const iconEmoji = this.getConfig<string>('iconEmoji');

            // Build message blocks for better formatting
            const blocks: any[] = [];

            if (params.subject) {
                blocks.push({
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: params.subject,
                    },
                });
            }

            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: params.message,
                },
            });

            // Add priority indicator
            if (params.priority === 'high') {
                blocks.push({
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: ':rotating_light: *High Priority*',
                        },
                    ],
                });
            }

            // Send message
            // const result = await this.client.chat.postMessage({
            //     channel,
            //     text: params.message,
            //     blocks,
            //     username,
            //     icon_emoji: iconEmoji,
            // });

            this.logger.log(`Sending Slack notification to ${channel}: ${params.message}`);

            return {
                success: true,
                data: {
                    messageId: 'msg_mock_' + Date.now(), // result.ts
                },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'SLACK_SEND_FAILED',
                    message: error.message,
                },
            };
        }
    }

    async sendBulk(
        notifications: Array<{
            recipient: string;
            message: string;
            metadata?: Record<string, any>;
        }>,
    ): Promise<IntegrationResponse<{ messageIds: string[] }>> {
        this.ensureActive();

        const messageIds: string[] = [];
        const errors: string[] = [];

        for (const notification of notifications) {
            const result = await this.send({
                recipient: notification.recipient,
                message: notification.message,
                metadata: notification.metadata,
            });

            if (result.success) {
                messageIds.push(result.data!.messageId);
            } else {
                errors.push(`Failed to send to ${notification.recipient}: ${result.error?.message}`);
            }
        }

        return {
            success: errors.length === 0,
            data: { messageIds },
            error:
                errors.length > 0
                    ? {
                          code: 'BULK_SEND_PARTIAL_FAILURE',
                          message: `${errors.length} messages failed`,
                          details: errors,
                      }
                    : undefined,
        };
    }

    async healthCheck(): Promise<boolean> {
        if (!this.isActive()) return false;

        try {
            // await this.client.auth.test();
            return true;
        } catch (error) {
            this.logger.error('Slack health check failed:', error);
            return false;
        }
    }
}
