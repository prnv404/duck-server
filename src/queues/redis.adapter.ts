import Redis from 'ioredis';

export function createIORedisFromUpstash(input: { host: string; port: number; password: string }): Redis {
    const redisConnection = new Redis({
        host: input.host,
        port: input.port,
        password: input.password,
        tls: {
            rejectUnauthorized: false,
        },
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
    });

    return redisConnection;
}
