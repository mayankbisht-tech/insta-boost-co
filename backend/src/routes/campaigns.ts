import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getCampaignSpendSummaries, getCampaignSpendSummary } from '../lib/campaignEarnings.js';
import { toCampaignPayload } from '../lib/serializers.js';
import { resolveSubmissionEarnings } from '../lib/submissionEarnings.js';

export const campaignsRouter = Router();

campaignsRouter.get('/', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const summaries = await getCampaignSpendSummaries(campaigns.map(campaign => campaign.id));

  res.json(campaigns.map(campaign => toCampaignPayload(campaign, summaries.get(campaign.id) ?? { billedViews: 0, spentBudgetRupees: 0 })));
});

campaignsRouter.get('/:id', async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  const summary = await getCampaignSpendSummary(campaign.id);

  res.json(toCampaignPayload(campaign, summary));
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
      username: submission.user?.username || submission.user?.name || 'Anonymous',
      views: submission.views,
      earnings: resolveSubmissionEarnings(submission.earnings, submission.status),
    })),
  });
});
