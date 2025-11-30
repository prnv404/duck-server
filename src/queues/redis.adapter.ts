import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

/**
 * Create an IORedis-compatible instance from Upstash Redis
 * BullMQ requires IORedis, but Upstash uses REST API
 * This adapter bridges the gap
 */
export function createIORedisFromUpstash(upstashUrl: string, upstashToken: string): Redis {
    // Parse Upstash URL to get host and port
    const url = new URL(upstashUrl);
    const host = url.hostname;
    const port = parseInt(url.port || '443', 10);

    // Create IORedis instance configured for Upstash
    const ioredis = new Redis({
        host,
        port,
        password: upstashToken,
        tls: {
            // Upstash requires TLS
            rejectUnauthorized: true,
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true,
    });

    return ioredis;
}
