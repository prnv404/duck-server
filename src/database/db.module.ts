// src/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { upstashCache } from 'drizzle-orm/cache/upstash';
import * as schema from './schema';
import { EnvService } from '@/config/env/config.service';

import { Redis } from '@upstash/redis';

export const DRIZZLE = 'DRIZZLE_CONNECTION';
export const REDIS = 'REDIS_CLIENT';

export type DrizzleDB = NodePgDatabase<typeof schema>;

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: DRIZZLE,
            inject: [EnvService],
            useFactory: async (configService: EnvService) => {
                const pool = new Pool({
                    host: configService.get('DATABASE_HOST'),
                    port: configService.get('DATABASE_PORT'),
                    user: configService.get('DATABASE_USER'),
                    password: configService.get('DATABASE_PASSWORD'),
                    database: configService.get('DATABASE_NAME'),
                    ssl: false,
                    max: configService.get('DATABASE_POOL_SIZE'),
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                });

                return drizzle(pool, {
                    schema,
                    // cache: upstashCache({
                    //     url: configService.get('UPSTASH_REDIS_REST_URL')!,
                    //     token: configService.get('UPSTASH_REDIS_REST_TOKEN')!,
                    // }),
                });
            },
        },
    ],
    exports: [DRIZZLE],
})
export class DatabaseModule {}
