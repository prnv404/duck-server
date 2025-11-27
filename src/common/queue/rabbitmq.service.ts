// src/rabbitmq/rabbitmq.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

interface MessageOptions {
    persistent?: boolean;
    priority?: number;
    expiration?: string;
    headers?: Record<string, any>;
}

interface ConsumeOptions {
    noAck?: boolean;
    prefetch?: number;
}

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private readonly logger = new Logger(RabbitMQService.name);
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isConnecting = false;
    private consumerTags: string[] = [];

    constructor(private readonly configService: ConfigService) {}

    async connect(): Promise<void> {
        if (this.isConnecting || this.connection) {
            return;
        }

        this.isConnecting = true;
        const uri = this.configService.get<string>('rabbitmq.uri');
        const options = this.configService.get('rabbitmq.connectionOptions');

        try {
            this.logger.log(`Connecting to RabbitMQ at ${uri}...`);
            this.connection = await amqp.connect(uri, options);

            this.connection.on('error', (err) => {
                this.logger.error('RabbitMQ connection error:', err);
                this.handleConnectionError();
            });

            this.connection.on('close', () => {
                this.logger.warn('RabbitMQ connection closed');
                this.handleConnectionError();
            });

            this.channel = await this.connection.createChannel();

            this.channel.on('error', (err) => {
                this.logger.error('RabbitMQ channel error:', err);
            });

            this.channel.on('close', () => {
                this.logger.warn('RabbitMQ channel closed');
            });

            const prefetchCount = this.configService.get<number>('rabbitmq.prefetchCount');
            await this.channel.prefetch(prefetchCount);

            await this.setupTopology();

            this.isConnecting = false;
            this.logger.log('Successfully connected to RabbitMQ');
        } catch (err) {
            this.isConnecting = false;
            this.logger.error('Failed to connect to RabbitMQ:', err);
            this.scheduleReconnect();
            throw err;
        }
    }

    private async setupTopology(): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not initialized');
        }

        const exchanges = this.configService.get('rabbitmq.exchanges');
        const queues = this.configService.get('rabbitmq.queues');

        // Create exchanges
        for (const exchange of exchanges) {
            await this.channel.assertExchange(exchange.name, exchange.type, exchange.options);
            this.logger.log(`Exchange '${exchange.name}' created`);
        }

        // Create queues and bindings
        for (const queue of queues) {
            await this.channel.purgeQueue(queue.name);
            await this.channel.assertQueue(queue.name, queue.options);

            if (queue.routingKey) {
                const exchangeName = queue.exchange || 'main.exchange';

                await this.channel.bindQueue(queue.name, exchangeName, queue.routingKey);
                this.logger.log(
                    `Queue '${queue.name}' bound to exchange '${exchangeName}' with routing key '${queue.routingKey}'`,
                );
            }

            this.logger.log(`Queue '${queue.name}' created and bound`);
        }
    }

    private handleConnectionError(): void {
        this.connection = null;
        this.channel = null;
        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            return;
        }

        const delay = this.configService.get<number>('rabbitmq.retryDelay');
        this.logger.log(`Scheduling reconnect in ${delay}ms`);

        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            try {
                await this.connect();
            } catch (err) {
                this.logger.error('Reconnection failed:', err);
            }
        }, delay);
    }

    async publish(exchange: string, routingKey: string, message: any, options?: MessageOptions): Promise<boolean> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        const content = Buffer.from(JSON.stringify(message));
        const publishOptions = {
            persistent: true,
            timestamp: Date.now(),
            ...options,
        };

        try {
            const result = this.channel.publish(exchange, routingKey, content, publishOptions);

            if (!result) {
                this.logger.warn('Message was buffered due to flow control');
            }
            this.logger.log(`Published message to exchange '${exchange}' with routing key '${routingKey}'`);

            return result;
        } catch (err) {
            this.logger.error('Failed to publish message:', err);
            throw err;
        }
    }

    async consume(queue: string, handler: (msg: any) => Promise<void>, options?: ConsumeOptions): Promise<string> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        const prefetch = options?.prefetch || this.configService.get<number>('rabbitmq.prefetchCount');
        await this.channel.prefetch(prefetch);

        const { consumerTag } = await this.channel.consume(
            queue,
            async (msg) => {
                if (!msg) return;

                try {
                    const content = JSON.parse(msg.content.toString());
                    const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;

                    await handler(content);

                    if (!options?.noAck) {
                        this.channel?.ack(msg);
                    }
                } catch (err) {
                    this.logger.error(`Error processing message from ${queue}:`, err);
                    await this.handleMessageError(msg, err);
                }
            },
            { noAck: options?.noAck || false },
        );

        this.consumerTags.push(consumerTag);
        this.logger.log(`Consumer started for queue '${queue}' with tag '${consumerTag}'`);

        return consumerTag;
    }

    private async handleMessageError(msg: amqp.Message, err: any): Promise<void> {
        if (!this.channel) return;

        const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;
        const maxRetries = this.configService.get<number>('rabbitmq.retryAttempts')!;

        if (retryCount < maxRetries) {
            const delay = this.configService.get<number>('rabbitmq.retryDelay')! * (retryCount + 1);

            this.logger.log(`Retrying message (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms`);

            setTimeout(() => {
                this.channel?.nack(msg, false, true);
            }, delay);
        } else {
            this.logger.error(`Max retries reached. Moving message to DLQ`);
            this.channel.nack(msg, false, false);
        }
    }

    async cancelConsumer(consumerTag: string): Promise<void> {
        if (!this.channel) return;

        await this.channel.cancel(consumerTag);
        this.consumerTags = this.consumerTags.filter((tag) => tag !== consumerTag);
        this.logger.log(`Consumer '${consumerTag}' cancelled`);
    }

    getChannel(): amqp.Channel | null {
        return this.channel;
    }

    isConnected(): boolean {
        return this.connection !== null && this.channel !== null;
    }

    async onModuleDestroy(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        for (const tag of this.consumerTags) {
            await this.cancelConsumer(tag);
        }

        if (this.channel) {
            await this.channel.close();
        }

        if (this.connection) {
            await this.connection.close();
        }

        this.logger.log('RabbitMQ connection closed');
    }
}
