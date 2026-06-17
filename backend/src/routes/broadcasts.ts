import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireAuth } from '../middleware/auth.js';

export const broadcastsRouter = Router();

broadcastsRouter.use(requireAuth);

const createBroadcastSchema = z.object({
  title: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  category: z.string().trim().max(80).optional(),
});

const toBroadcastPayload = (
  broadcast: {
    id: string;
    title: string | null;
    message: string;
    category: string | null;
    sentById: string;
    createdAt: Date;
    reads?: { userId: string }[];
  },
  userId?: string,
) => ({
  id: broadcast.id,
  title: broadcast.title ?? null,
  message: broadcast.message,
  category: broadcast.category ?? null,
  sent_by_id: broadcast.sentById,
  created_at: broadcast.createdAt.toISOString(),
  read: userId
    ? (broadcast.reads ?? []).some(r => r.userId === userId)
    : undefined,
});

// ─── Admin: create broadcast ──────────────────────────────────────────────────
broadcastsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = createBroadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid broadcast data.' });
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      title: parsed.data.title ?? null,
      message: parsed.data.message,
      category: parsed.data.category ?? null,
      sentById: req.auth!.user.id,
    },
  });

  res.status(201).json(toBroadcastPayload(broadcast));
});

// ─── Admin: list all broadcasts ───────────────────────────────────────────────
broadcastsRouter.get('/admin', requireAdmin, async (_req, res) => {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    include: { reads: { select: { userId: true } } },
  });

  res.json(
    broadcasts.map(b => ({
      ...toBroadcastPayload(b),
      read_count: b.reads.length,
    })),
  );
});

// ─── Admin: delete broadcast ──────────────────────────────────────────────────
broadcastsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const existing = await prisma.broadcast.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Broadcast not found.' });
  }

  await prisma.broadcast.delete({ where: { id } });
  res.json({ message: 'Broadcast deleted.' });
});

// ─── User: list broadcasts for current user (with read status) ────────────────
broadcastsRouter.get('/', async (req, res) => {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reads: {
        where: { userId: req.auth!.user.id },
        select: { userId: true },
      },
    },
  });

  res.json(broadcasts.map(b => toBroadcastPayload(b, req.auth!.user.id)));
});

// ─── User: mark all broadcasts as read ───────────────────────────────────────
broadcastsRouter.post('/read-all', async (req, res) => {
  const broadcasts = await prisma.broadcast.findMany({ select: { id: true } });

  const creates = broadcasts.map(b => ({
    broadcastId: b.id,
    userId: req.auth!.user.id,
  }));

  await prisma.broadcastRead.createMany({
    data: creates,
    skipDuplicates: true,
  });

  res.json({ message: 'All broadcasts marked as read.' });
});

// ─── User: mark a broadcast as read ──────────────────────────────────────────
broadcastsRouter.post('/:id/read', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const broadcast = await prisma.broadcast.findUnique({ where: { id } });
  if (!broadcast) {
    return res.status(404).json({ error: 'Broadcast not found.' });
  }

  await prisma.broadcastRead.upsert({
    where: {
      broadcastId_userId: {
        broadcastId: id,
        userId: req.auth!.user.id,
      },
    },
    update: {},
    create: {
      broadcastId: id,
      userId: req.auth!.user.id,
    },
  });

  res.json({ message: 'Marked as read.' });
});
