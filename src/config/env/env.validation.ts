// src/config/validateEnv.ts
import { z } from 'zod';
import { EnvConfig, envSchema } from './env.schema';

export function validateEnv(config: Record<string, unknown>): EnvConfig {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        const formatted = parsed.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n');
        throw new Error(`❌ Invalid environment configuration:\n${formatted}`);
    }

    return parsed.data;
}
