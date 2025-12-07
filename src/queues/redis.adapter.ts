import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const logger = new Logger('RedisAdapter');

export function createIORedisFromUpstash(input: { host: string; port: number; password: string }): Redis {
    logger.log(`Attempting to connect to Redis at ${input.host}:${input.port}`);

    const redisConnection = new Redis({
        host: input.host,
        port: input.port,
        password: input.password,
        tls: {
            rejectUnauthorized: true,
        },
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
    });

    // Connection event handlers
    redisConnection.on('connect', () => {
        logger.log(`✅ Redis connection established to ${input.host}:${input.port}`);
    });

    redisConnection.on('ready', () => {
        logger.log(`✅ Redis is ready and accepting commands`);
    });

    redisConnection.on('error', (err) => {
        logger.error(`❌ Redis connection error: ${err.message}`, err.stack);
    });

    redisConnection.on('close', () => {
        logger.warn(`⚠️ Redis connection closed`);
    });

    redisConnection.on('reconnecting', (delay: number) => {
        logger.log(`🔄 Redis reconnecting in ${delay}ms...`);
    });

    redisConnection.on('end', () => {
        logger.warn(`⚠️ Redis connection ended`);
    });

    return redisConnection;
}
