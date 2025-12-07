import Redis from 'ioredis';

export function createIORedisFromUpstash(input: { host: string; port: number; password: string }): Redis {
    const redisConnection = new Redis({
        host: input.host,
        port: input.port,
        password: input.password,
        // Remove TLS - Redis Labs doesn't require it for this connection
        tls: {
            rejectUnauthorized: true
        },
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
    });

    return redisConnection;
}
