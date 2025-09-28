import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

loadEnv();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .url('DATABASE_URL must be a valid URL')
    .refine((value) => value.startsWith('postgres'), {
      message: 'DATABASE_URL must point to a PostgreSQL instance',
    }),
  BETTER_AUTH_SECRET: z.string({ required_error: 'BETTER_AUTH_SECRET is required' }).min(1),
  BETTER_AUTH_URL: z.string({ required_error: 'BETTER_AUTH_URL is required' }).url(),
  NEXT_PUBLIC_BETTER_AUTH_URL: z
    .string({ required_error: 'NEXT_PUBLIC_BETTER_AUTH_URL is required' })
    .url(),
  WA_OUTBOUND_URL: z.string({ required_error: 'WA_OUTBOUND_URL is required' }).url(),
  FILES_DIR: z
    .string({ required_error: 'FILES_DIR is required' })
    .min(1)
    .transform((dir) => path.resolve(dir)),
});

const env = envSchema.parse(process.env);

export default env;
