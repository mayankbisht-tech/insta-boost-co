import { prisma } from './prisma.js';

export const createNotification = async (userId: string, message: string) =>
  prisma.notification.create({
    data: {
      userId,
      message,
    },
  });
