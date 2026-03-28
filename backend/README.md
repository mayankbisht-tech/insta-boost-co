# Insta Boost Backend

Standalone backend for authentication, OTP signup, sessions, and PostgreSQL data access.

## Quick start

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your Neon Postgres connection string
3. Set `SESSION_SECRET` to a long random string
4. Optionally set `RESEND_API_KEY` and `OTP_FROM_EMAIL`
5. Install dependencies with `npm install`
6. Generate Prisma client with `npm run prisma:generate`
7. Push schema with `npm run prisma:push`
8. Start development server with `npm run dev`

## Auth routes

- `POST /api/auth/signup/send-otp`
- `POST /api/auth/signup/verify-otp`
- `POST /api/auth/signup/complete`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`
