// src/config/validateEnv.ts
import { envSchema, EnvConfig } from './env.schema';
import { z } from 'zod';

export function validateEnv(config: Record<string, unknown>): EnvConfig {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        const formatted = parsed.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n');
        throw new Error(`❌ Invalid environment configuration:\n${formatted}`);
    }

    return parsed.data;
}
