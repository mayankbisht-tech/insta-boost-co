import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getSocketServer } from '../lib/realtime.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireAuth } from '../middleware/auth.js';

export const supportRouter = Router();

supportRouter.use(requireAuth);

const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

const toMessagePayload = (msg: {
  id: string;
  userId: string;
  message: string;
  fromAdmin: boolean;
  readAt: Date | null;
  createdAt: Date;
}) => ({
  id: msg.id,
  user_id: msg.userId,
  message: msg.message,
  from_admin: msg.fromAdmin,
  read_at: msg.readAt?.toISOString() ?? null,
  created_at: msg.createdAt.toISOString(),
});

// ─── User: get their own support thread ──────────────────────────────────────
supportRouter.get('/my-thread', async (req, res) => {
  const messages = await prisma.supportMessage.findMany({
    where: { userId: req.auth!.user.id },
    orderBy: { createdAt: 'asc' },
  });

  // Mark admin messages as read
  const unreadAdminMsgIds = messages
    .filter(m => m.fromAdmin && !m.readAt)
    .map(m => m.id);

  if (unreadAdminMsgIds.length > 0) {
    await prisma.supportMessage.updateMany({
      where: { id: { in: unreadAdminMsgIds } },
      data: { readAt: new Date() },
    });
  }

  res.json(messages.map(toMessagePayload));
});

// ─── User: send a message to admin ───────────────────────────────────────────
supportRouter.post('/my-thread', async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid message.' });
  }

  const msg = await prisma.supportMessage.create({
    data: {
      userId: req.auth!.user.id,
      message: parsed.data.message,
      fromAdmin: false,
    },
  });

  // Emit real-time event so admin sees it instantly
  const io = getSocketServer();
  if (io) {
    io.emit(`support:message:${req.auth!.user.id}`, toMessagePayload(msg));
    io.emit('support:new-message', { userId: req.auth!.user.id });
  }

  res.status(201).json(toMessagePayload(msg));
});

// ─── User: unread admin message count ────────────────────────────────────────
supportRouter.get('/my-thread/unread-count', async (req, res) => {
  const count = await prisma.supportMessage.count({
    where: {
      userId: req.auth!.user.id,
      fromAdmin: true,
      readAt: null,
    },
  });

  res.json({ unread_count: count });
});

// ─── Admin: list all user threads (latest message per user) ──────────────────
supportRouter.get('/threads', requireAdmin, async (_req, res) => {
  const threads = await prisma.supportMessage.findMany({
    distinct: ['userId'],
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, username: true, email: true },
      },
    },
  });

  // For each thread, get unread count (user messages admin hasn't read — messages from user where readAt is null)
  const threadSummaries = await Promise.all(
    threads.map(async latest => {
      const unreadFromUser = await prisma.supportMessage.count({
        where: {
          userId: latest.userId,
          fromAdmin: false,
          readAt: null,
        },
      });

      return {
        user: {
          id: latest.user.id,
          name: latest.user.name,
          username: latest.user.username,
          email: latest.user.email,
        },
        latest_message: toMessagePayload(latest),
        unread_from_user: unreadFromUser,
      };
    }),
  );

  res.json(threadSummaries);
});

// ─── Admin: get full thread for a user ───────────────────────────────────────
supportRouter.get('/threads/:userId', requireAdmin, async (req, res) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, email: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  // Mark user messages as read by admin
  const unreadUserMsgIds = messages
    .filter(m => !m.fromAdmin && !m.readAt)
    .map(m => m.id);

  if (unreadUserMsgIds.length > 0) {
    await prisma.supportMessage.updateMany({
      where: { id: { in: unreadUserMsgIds } },
      data: { readAt: new Date() },
    });
  }

  res.json({ user, messages: messages.map(toMessagePayload) });
});

// ─── Admin: reply in a user's thread ─────────────────────────────────────────
supportRouter.post('/threads/:userId', requireAdmin, async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid message.' });
  }

  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const msg = await prisma.supportMessage.create({
    data: {
      userId,
      message: parsed.data.message,
      fromAdmin: true,
    },
  });

  // Emit real-time event to the user
  const io = getSocketServer();
  if (io) {
    io.emit(`support:message:${userId}`, toMessagePayload(msg));
  }

  res.status(201).json(toMessagePayload(msg));
});
