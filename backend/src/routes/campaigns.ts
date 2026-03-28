import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { toCampaignPayload } from '../lib/serializers.js';

export const campaignsRouter = Router();

campaignsRouter.get('/', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.json(campaigns.map(toCampaignPayload));
});

campaignsRouter.get('/:id', async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  res.json(toCampaignPayload(campaign));
});

campaignsRouter.get('/:id/leaderboard', async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  const submissions = await prisma.submission.findMany({
    where: { campaignId: req.params.id },
    orderBy: { views: 'desc' },
    include: {
      user: true,
    },
  });

  res.json({
    campaign_title: campaign.title,
    entries: submissions.map((submission, index) => ({
      rank: index + 1,
      username: submission.user?.instagramUsername || submission.user?.name || 'Anonymous',
      views: submission.views,
      earnings: Number(submission.earnings),
    })),
  });
});
