// src/database/migrate.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigrations = async () => {
    const pool = new Pool({
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool);

    console.log('Running migrations...');

    await migrate(db, { migrationsFolder: './drizzle/migrations' });

    console.log('Migrations completed successfully!');

    await pool.end();
};

runMigrations().catch((err) => {
    console.error('Migration failed!');
    console.error(err);
    process.exit(1);
});
