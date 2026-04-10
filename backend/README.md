# Insta Boost Backend

Standalone backend for authentication, OTP signup, sessions, and PostgreSQL data access.

## Quick start

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your Neon Postgres connection string
3. Set `SESSION_SECRET` to a long random string
4. Set `FRONTEND_ORIGIN` to your frontend URL. You can provide multiple URLs as a comma-separated list.
5. For split-domain deploys such as Vercel frontend + Render backend, set `SESSION_COOKIE_SAME_SITE="none"` and serve over HTTPS
6. Optionally set SMTP and Apify values
7. Install dependencies with `npm install`
8. Generate Prisma client with `npm run prisma:generate`
9. Create or apply Prisma migrations for schema changes
10. Apply migrations locally with `npm run prisma:migrate:deploy` if you already have migration files
11. Start development server with `npm run dev`

## Production start

1. Build with `npm run build`
2. Start with `npm run start`

## Database workflow

- Use migration files under `prisma/migrations` for schema changes
- Deploy schema changes with `npm run prisma:migrate:deploy`
- Avoid using `npm run prisma:push` in production because it bypasses migration history

## Auth routes

- `POST /api/auth/signup/send-otp`
- `POST /api/auth/signup/verify-otp`
- `POST /api/auth/signup/complete`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`
