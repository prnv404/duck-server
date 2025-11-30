// src/config/env.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    PORT: z.coerce.number().default(3000),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    API_KEY: z.string().optional(),

    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    DATABASE_HOST: z.string().default('localhost'),
    DATABASE_PORT: z.coerce.number().default(5432),
    DATABASE_USER: z.string().default('postgres'),
    DATABASE_PASSWORD: z.string().default(''),
    DATABASE_NAME: z.string().default('myapp'),
    DATABASE_SSL: z.coerce.boolean().default(false),
    DATABASE_POOL_SIZE: z.coerce.number().default(20),

    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),

    REDIS_URL: z.string().url(),

    REDIS_PASSWORD: z.string(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number().default(6379),

    APP_URL: z.string().url(),

    GEMINI_API_KEY: z.string(),

    STORAGE_BUCKET: z.string(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_KEY: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;
