import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../database/schema';
import { expo } from '@better-auth/expo';

// Create a dedicated pool for Better Auth
const pool = new Pool({
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT!),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const db = drizzle(pool, { schema });

export const auth = betterAuth({
    plugins: [expo()],
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes cache
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    trustedOrigins: [
        'exp://', // Expo development base
        'exp://*', // Expo development with paths
        'duck://', // Production app scheme base
        'duck://*', // Production app scheme with paths
        'https://delia-unsigneted-marcela.ngrok-free.dev',
        'https://delia-unsigneted-marcela.ngrok-free.dev/*',
    ],
    // Enable Bearer token authentication for mobile clients
    advanced: {
        useSecureCookies: false, // Allow non-secure cookies for development
        crossSubDomainCookies: {
            enabled: true,
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await db.insert(schema.userStats).values({
                        userId: user.id,
                    });
                    await db.insert(schema.userQuizPreferences).values({
                        userId: user.id,
                    });
                },
            },
        },
    },
});
