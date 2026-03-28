import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toSubmissionPayload } from '../lib/serializers.js';

export const submissionsRouter = Router();

const createSubmissionSchema = z.object({
  campaign_id: z.string().min(1),
  reel_url: z.string().trim().url(),
});

submissionsRouter.use(requireAuth);

submissionsRouter.get('/', async (req, res) => {
  const submissions = await prisma.submission.findMany({
    where: { userId: req.auth!.user.id },
    include: {
      campaign: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  res.json(submissions.map(toSubmissionPayload));
});

submissionsRouter.post('/', async (req, res) => {
  const parsed = createSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid submission data.' });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: parsed.data.campaign_id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  const submission = await prisma.submission.create({
    data: {
      userId: req.auth!.user.id,
      campaignId: parsed.data.campaign_id,
      reelUrl: parsed.data.reel_url,
    },
    include: {
      campaign: true,
    },
  });

  res.status(201).json(toSubmissionPayload(submission));
});
