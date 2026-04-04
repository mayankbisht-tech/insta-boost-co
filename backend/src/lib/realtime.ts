import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from './prisma.js';
import { toCampaignPayload } from './serializers.js';

let io: SocketIOServer | null = null;

export const setSocketServer = (socketServer: SocketIOServer) => {
  io = socketServer;
};

export const getSocketServer = () => io;

export const emitCampaignBudgetUpdate = async (campaignId: string) => {
  if (!io) {
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return;
  }

  const aggregate = await prisma.submission.aggregate({
    where: {
      campaignId,
      status: { notIn: ['Rejected', 'Flagged'] },
    },
    _sum: { views: true },
  });

  const billedViews = aggregate._sum.views ?? 0;
  const payload = toCampaignPayload(campaign, billedViews);

  io.emit('campaign:budget-updated', payload);
};
