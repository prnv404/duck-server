// src/config/rabbitmq.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('rabbitmq', () => ({
    uri: process.env.RABBITMQ_URI,
    exchanges: [
        {
            name: 'main.exchange',
            type: 'topic',
            options: { durable: true },
        },
        {
            name: 'dlx.exchange',
            type: 'topic',
            options: { durable: true },
        },
        {
            name: 'event.exchange',
            type: 'topic',
            options: { durable: true },
        },
    ],
    queues: [
        {
            name: 'event.queue',
            exchange: 'event.exchange',
            type: 'queue',
            routingKey: 'event.created',
            options: { durable: true },
        },
    ],
    connectionOptions: {
        heartbeat: 60,
        connectionTimeout: 30000,
    },
    prefetchCount: 10,
    retryAttempts: 3,
    retryDelay: 3000,
}));
