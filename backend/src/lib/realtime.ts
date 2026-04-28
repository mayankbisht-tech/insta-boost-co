import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from './prisma.js';
import { getCampaignSpendSummary } from './campaignEarnings.js';
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

  const summary = await getCampaignSpendSummary(campaignId);
  const payload = toCampaignPayload(campaign, summary);

  io.emit('campaign:budget-updated', payload);
};
