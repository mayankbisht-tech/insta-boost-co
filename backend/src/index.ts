import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { profileRouter } from './routes/profile.js';
import { submissionsRouter } from './routes/submissions.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Extend Express Request type to include file
declare global {
  namespace Express {
    interface Request {
      fileUrl?: string;
    }
  }
}

const allowedOrigins = [
  env.FRONTEND_ORIGIN,
  'https://goclips.netlify.app',
  'http://localhost:8080',
  'http://localhost:5173',
]
  .map(origin => origin.replace(/\/$/, ''))
  .filter((origin, index, array) => array.indexOf(origin) === index);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server/health requests that do not send an Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    callback(null, allowedOrigins.includes(normalizedOrigin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Serve uploaded files as static
app.use('/uploads', express.static(uploadsDir));

// Middleware to process file uploads for admin campaigns
const uploadCampaignImage = upload.single('image');
const campaignUploadMiddleware = (req: Request, _res: any, next: any) => {
  uploadCampaignImage(req, _res, (err: any) => {
    if (err) {
      return next(err);
    }
    if (req.file) {
      req.fileUrl = `/uploads/${req.file.filename}`;
    }
    next();
  });
};

app.get('/', (_req, res) => {
  res.json({ message: 'Insta Boost backend is running.' });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin/campaigns', campaignUploadMiddleware);
app.use('/api/admin', adminRouter);

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});
