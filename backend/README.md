# Insta Boost Backend

Standalone backend for authentication, OTP signup, sessions, and PostgreSQL data access.

## Quick start

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your Neon Postgres connection string
3. Set `SESSION_SECRET` to a long random string
4. Set `FRONTEND_ORIGIN` to your frontend URL
5. For split-domain deploys, set `SESSION_COOKIE_SAME_SITE="none"` and serve over HTTPS
6. Optionally set SMTP and Apify values
7. Install dependencies with `npm install`
8. Generate Prisma client with `npm run prisma:generate`
9. Push schema with `npm run prisma:push`
10. Start development server with `npm run dev`

## Production start

1. Build with `npm run build`
2. Start with `npm run start`

## Auth routes

- `POST /api/auth/signup/send-otp`
- `POST /api/auth/signup/verify-otp`
- `POST /api/auth/signup/complete`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`
