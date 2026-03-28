import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toNotificationPayload } from '../lib/serializers.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.auth!.user.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(notifications.map(toNotificationPayload));
});

notificationsRouter.patch('/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.auth!.user.id,
      read: false,
    },
    data: { read: true },
  });

  res.json({ message: 'Notifications marked as read.' });
});
