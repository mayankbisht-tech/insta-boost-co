import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { profileRouter } from './routes/profile.js';
import { submissionsRouter } from './routes/submissions.js';

const app = express();
const allowedOrigins = new Set(env.FRONTEND_ORIGIN);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({ message: 'Insta Boost backend is running.' });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);

app.listen(env.PORT, env.HOST, () => {
  console.log(`Backend listening on http://${env.HOST}:${env.PORT}`);
});
