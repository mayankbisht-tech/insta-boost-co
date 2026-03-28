import { AppRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toCampaignPayload, toFrontendProfile, toSubmissionPayload } from '../lib/serializers.js';

export const adminRouter = Router();

const campaignSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  reward_per_million_views: z.coerce.number().int().min(0),
  rules: z.array(z.string().trim()).default([]),
  status: z.string().trim().min(1),
  image_url: z.string().trim().nullable().optional(),
});

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', async (_req, res) => {
  const [totalUsers, totalCampaigns, submissions] = await Promise.all([
    prisma.user.count(),
    prisma.campaign.count(),
    prisma.submission.findMany({ select: { status: true } }),
  ]);

  res.json({
    totalUsers,
    totalCampaigns,
    totalSubmissions: submissions.length,
    approved: submissions.filter(item => item.status === 'Approved').length,
    rejected: submissions.filter(item => item.status === 'Rejected').length,
    pending: submissions.filter(item => item.status === 'Pending').length,
  });
});

adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { roles: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users.map(toFrontendProfile));
});

adminRouter.get('/campaigns', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.json(campaigns.map(toCampaignPayload));
});

adminRouter.post('/campaigns', async (req, res) => {
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid campaign data.' });
  }

  const campaign = await prisma.campaign.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      rewardPerMillionViews: parsed.data.reward_per_million_views,
      rules: parsed.data.rules,
      status: parsed.data.status,
      imageUrl: parsed.data.image_url ?? null,
      createdByAdminId: req.auth!.user.id,
    },
  });

  res.status(201).json(toCampaignPayload(campaign));
});

adminRouter.put('/campaigns/:id', async (req, res) => {
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid campaign data.' });
  }

  const campaign = await prisma.campaign.update({
    where: { id: req.params.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      rewardPerMillionViews: parsed.data.reward_per_million_views,
      rules: parsed.data.rules,
      status: parsed.data.status,
      imageUrl: parsed.data.image_url ?? null,
      createdByAdminId: req.auth!.user.id,
    },
  });

  res.json(toCampaignPayload(campaign));
});

adminRouter.delete('/campaigns/:id', async (req, res) => {
  await prisma.campaign.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Campaign deleted.' });
});

adminRouter.get('/submissions', async (_req, res) => {
  const submissions = await prisma.submission.findMany({
    include: {
      campaign: true,
      user: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  res.json(submissions.map(toSubmissionPayload));
});

adminRouter.patch('/submissions/:id/status', async (req, res) => {
  const parsed = z.object({
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Flagged']),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid submission status.' });
  }

  const submission = await prisma.submission.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      reviewedAt: new Date(),
      reviewedByAdmin: req.auth!.user.id,
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  res.json(toSubmissionPayload(submission));
});

adminRouter.patch('/submissions/:id/views', async (req, res) => {
  const parsed = z.object({
    views: z.coerce.number().int().min(0),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid views value.' });
  }

  const existing = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { campaign: true, user: true },
  });

  if (!existing || !existing.campaign) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const earnings = Number(((parsed.data.views / 1_000_000) * existing.campaign.rewardPerMillionViews).toFixed(2));

  const submission = await prisma.submission.update({
    where: { id: req.params.id },
    data: {
      views: parsed.data.views,
      earnings,
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  res.json(toSubmissionPayload(submission));
});
