import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const logger = new Logger('RedisAdapter');

export function createIORedis(url: string): Redis {
    logger.log(`Attempting to connect to Redis...`);

    const redisConnection = new Redis(url, {
        enableReadyCheck: false, // Required for Bull
        maxRetriesPerRequest: null, // Required for Bull - must be null for blocking commands
        retryStrategy: (times) => {
            if (times > 10) {
                logger.error('Max Redis reconnection attempts reached');
                return null;
            }
            return Math.min(times * 100, 3000);
        },
    });

    // Connection event handlers
    redisConnection.on('connect', () => {
        logger.log(`✅ Redis connection established`);
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
