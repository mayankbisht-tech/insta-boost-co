# Insta Boost

Frontend is a Vite React app in the repo root. Backend is an Express + Prisma app in [`backend`](c:\Users\LENOVO\Desktop\projects\insta\insta-boost-co\backend).

## Deployment

1. Frontend:
Set `VITE_API_URL` in [`.env.example`](c:\Users\LENOVO\Desktop\projects\insta\insta-boost-co\.env.example) to your deployed backend URL.
Run `npm install` and `npm run build`.

2. Backend:
Copy [`backend/.env.example`](c:\Users\LENOVO\Desktop\projects\insta\insta-boost-co\backend\.env.example) to `backend/.env`.
Fill database, session, SMTP, and Apify values.
If frontend and backend are on different domains, set `SESSION_COOKIE_SAME_SITE="none"` and use HTTPS.
Run `npm install`, `npm run prisma:generate`, `npm run build`, and `npm run start` inside `backend`.

3. Full build:
Run `npm run build:all` from the repo root to build both apps.
