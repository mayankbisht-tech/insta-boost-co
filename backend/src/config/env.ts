import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:8080'),
  SESSION_COOKIE_NAME: z.string().min(1).default('insta_boost_session'),
  SESSION_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional(),
  OTP_FROM_EMAIL: z.string().optional(),
  OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(8),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid backend environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Backend environment validation failed');
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
