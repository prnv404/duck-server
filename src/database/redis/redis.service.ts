import { Inject, Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

    getClient(): Redis {
        return this.redis;
    }

    async ping(): Promise<string> {
        return this.redis.ping();
    }
}
