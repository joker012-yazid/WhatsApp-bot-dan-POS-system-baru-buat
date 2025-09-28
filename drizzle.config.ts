import { defineConfig } from 'drizzle-kit';
import env from './env.mjs';

export default defineConfig({
    out: './drizzle',
    schema: './db/schema/*',
    dialect: 'postgresql',
    dbCredentials: {
        url: env.DATABASE_URL,
    },
});
