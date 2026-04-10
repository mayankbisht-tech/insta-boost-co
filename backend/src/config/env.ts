import 'dotenv/config';
import { z } from 'zod';

const defaultNodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const defaultSessionSameSite = defaultNodeEnv === 'production' ? 'none' : 'lax';

const optionalUrl = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().url().optional(),
);

const frontendOrigins = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  const origins = value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : undefined;
}, z.array(z.string().url()).min(1).default(['http://localhost:8080']));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  HOST: z.string().trim().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: frontendOrigins,
  SESSION_COOKIE_NAME: z.string().min(1).default('insta_boost_session'),
  SESSION_SECRET: z.string().min(16),
  SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default(defaultSessionSameSite),
  REEL_SUBMISSION_WINDOW_MINUTES: z.coerce.number().int().positive().default(30),
  INSTAGRAM_VERIFICATION_WINDOW_MINUTES: z.coerce.number().int().positive().default(5),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().trim().optional(),
  OTP_FROM_EMAIL: z.string().trim().email().optional(),
  OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(8),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  APIFY_API_TOKEN: z.string().trim().optional(),
  APIFY_ACTOR_RUN_URL: optionalUrl,
  APIFY_ACTOR_INPUT_URL: optionalUrl,
  APIFY_REEL_RUN_SYNC_GET_URL: optionalUrl,
  APIFY_DATASET_ITEMS_URL: optionalUrl,
  APIFY_LAST_RUN_DATASET_ITEMS_URL: optionalUrl,
  APIFY_DATASET_ITEMS_LIMIT: z.coerce.number().int().min(50).max(5000).default(1000),
  APIFY_PROFILE_DATASET_ITEMS_URL: optionalUrl,
  APIFY_PROFILE_RUN_SYNC_GET_URL: optionalUrl,
  APIFY_LOGS_URL: optionalUrl,
  APIFY_RESURRECT_URL: optionalUrl,
  APIFY_ABORT_URL: optionalUrl,
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid backend environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Backend environment validation failed');
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
