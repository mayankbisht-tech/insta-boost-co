import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import multer, { type FileFilterCallback, type StorageEngine } from 'multer';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { setSocketServer } from './lib/realtime.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { profileRouter } from './routes/profile.js';
import { submissionsRouter } from './routes/submissions.js';

const app = express();
const httpServer = createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
type CampaignUploadRequest = Request & {
  file?: {
    filename: string;
  };
  fileUrl?: string;
};

const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadsDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const allowedOrigins = [
  ...env.FRONTEND_ORIGIN,
  'https://goclips.netlify.app',
  'http://localhost:8080',
  'http://localhost:5173',
]
  .map(origin => origin.replace(/\/$/, ''))
  .filter((origin, index, array) => array.indexOf(origin) === index);

const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/i,
];

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.includes(origin) || allowedOriginPatterns.some(pattern => pattern.test(origin));

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server/health requests that do not send an Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    callback(null, isAllowedOrigin(normalizedOrigin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.set('trust proxy', 1);
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
const campaignUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const uploadRequest = req as CampaignUploadRequest;

  uploadCampaignImage(uploadRequest, res, (err?: unknown) => {
    if (err) {
      return next(err);
    }
    if (uploadRequest.file) {
      uploadRequest.fileUrl = `/uploads/${uploadRequest.file.filename}`;
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

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, '');
      callback(null, isAllowedOrigin(normalizedOrigin));
    },
    credentials: true,
  },
});

io.on('connection', socket => {
  socket.emit('system:connected', { ok: true, at: new Date().toISOString() });
});

setSocketServer(io);

httpServer.listen(env.PORT, env.HOST, () => {
  console.log(`Backend listening on http://${env.HOST}:${env.PORT}`);
});
