import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { toCampaignPayload } from '../lib/serializers.js';
import { resolveSubmissionEarnings } from '../lib/submissionEarnings.js';

export const campaignsRouter = Router();

campaignsRouter.get('/', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const billedViewsByCampaign = await prisma.submission.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: { in: campaigns.map(campaign => campaign.id) },
      status: { notIn: ['Rejected', 'Flagged'] },
    },
    _sum: {
      views: true,
    },
  });

  const billedViewsMap = new Map(
    billedViewsByCampaign.map(item => [item.campaignId, item._sum.views ?? 0]),
  );

  res.json(campaigns.map(campaign => toCampaignPayload(campaign, billedViewsMap.get(campaign.id) ?? 0)));
});

campaignsRouter.get('/:id', async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  const aggregate = await prisma.submission.aggregate({
    where: {
      campaignId: campaign.id,
      status: { notIn: ['Rejected', 'Flagged'] },
    },
    _sum: {
      views: true,
    },
  });

  res.json(toCampaignPayload(campaign, aggregate._sum.views ?? 0));
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
      earnings: resolveSubmissionEarnings(submission.earnings, submission.status),
    })),
  });
});
