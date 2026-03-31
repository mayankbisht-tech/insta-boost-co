import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getApifyAnalyticsByReelCode } from '../lib/apify.js';
import { consumeRefreshQuota, getRefreshQuota, syncSubmissionAnalytics } from '../lib/analyticsRefresh.js';
import { prisma } from '../lib/prisma.js';
import { extractInstagramReelCode, normalizeInstagramReelUrl, normalizeInstagramUsername } from '../lib/reels.js';
import { toSubmissionPayload } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { addMinutes } from '../utils/time.js';

export const submissionsRouter = Router();

const createSubmissionSchema = z.object({
  campaign_id: z.string().min(1),
  reel_url: z.string().trim().url(),
});

const calculateEarnings = (views: number, rewardPerMillionViews: number) =>
  Number(((views / 1_000_000) * rewardPerMillionViews).toFixed(2));

submissionsRouter.use(requireAuth);

submissionsRouter.get('/overview', async (req, res) => {
  const submissions = await prisma.submission.findMany({
    where: { userId: req.auth!.user.id },
    orderBy: { submittedAt: 'desc' },
  });

  const totalViews = submissions.reduce((sum, submission) => sum + submission.views, 0);
  const totalEarnings = submissions.reduce((sum, submission) => sum + Number(submission.earnings), 0);
  const bestSubmission = submissions.reduce<typeof submissions[number] | null>(
    (best, submission) => (!best || submission.views > best.views ? submission : best),
    null,
  );
  const latestSync = submissions.reduce<Date | null>((latest, submission) => {
    if (!submission.analyticsSyncedAt) {
      return latest;
    }

    if (!latest || submission.analyticsSyncedAt > latest) {
      return submission.analyticsSyncedAt;
    }

    return latest;
  }, null);

  res.json({
    total_submissions: submissions.length,
    approved: submissions.filter(submission => submission.status === 'Approved').length,
    rejected: submissions.filter(submission => submission.status === 'Rejected').length,
    pending: submissions.filter(submission => submission.status === 'Pending').length,
    total_views: totalViews,
    total_earnings: Number(totalEarnings.toFixed(2)),
    average_views: submissions.length ? Math.round(totalViews / submissions.length) : 0,
    active_reels: submissions.filter(submission => submission.status === 'Pending' || submission.status === 'Approved').length,
    reels_with_analytics: submissions.filter(submission => Boolean(submission.analyticsSyncedAt)).length,
    best_reel_views: bestSubmission?.views ?? 0,
    latest_sync_at: latestSync?.toISOString() ?? null,
  });
});

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

submissionsRouter.get('/refresh-quota', async (req, res) => {
  const quota = getRefreshQuota(req.auth!.user);
  res.json({
    refresh_limit: quota.refreshLimit,
    refreshes_remaining: quota.refreshesRemaining,
    window_resets_at: quota.windowResetsAt,
  });
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

  if (campaign.status !== 'Active') {
    return res.status(400).json({ error: 'This campaign is not accepting reels right now.' });
  }

  const reelCode = extractInstagramReelCode(parsed.data.reel_url);
  const normalizedReelUrl = normalizeInstagramReelUrl(parsed.data.reel_url);

  if (!reelCode || !normalizedReelUrl) {
    return res.status(400).json({ error: 'Please submit a valid Instagram reel URL.' });
  }

  const duplicateSubmission = await prisma.submission.findFirst({
    where: {
      OR: [
        { reelCode },
        { normalizedReelUrl },
      ],
    },
    include: { user: true },
  });

  if (duplicateSubmission) {
    const isSameUser = duplicateSubmission.userId === req.auth!.user.id;
    return res.status(409).json({
      error: isSameUser
        ? 'This reel has already been submitted.'
        : `This reel was already submitted by @${duplicateSubmission.user?.instagramUsername ?? 'another creator'}.`,
    });
  }

  let analyticsResult;
  try {
    analyticsResult = await getApifyAnalyticsByReelCode(reelCode);
  } catch {
    analyticsResult = null;
  }

  if (!analyticsResult || analyticsResult.status === 'not-found') {
    return res.status(400).json({
      error: 'This reel is not in the Apify dataset yet, so upload time could not be verified.',
    });
  }

  if (analyticsResult.status === 'missing-timestamp') {
    return res.status(400).json({
      error: 'This reel was found in Apify, but its upload timestamp is still missing.',
    });
  }

  if (analyticsResult.status === 'invalid-timestamp') {
    return res.status(400).json({
      error: 'This reel was found in Apify, but its upload timestamp is invalid.',
    });
  }

  if (analyticsResult.status === 'not-configured') {
    return res.status(400).json({
      error: 'Apify reel verification is not configured on the backend.',
    });
  }

  if (analyticsResult.status !== 'ok') {
    return res.status(400).json({
      error: 'Reel analytics could not be verified right now.',
    });
  }

  const analyticsSnapshot = analyticsResult.snapshot;
  const resolvedUploadedAt = analyticsSnapshot.uploadedAt;
  if (!resolvedUploadedAt) {
    return res.status(400).json({
      error: 'Reel analytics were found, but the upload time is still unavailable.',
    });
  }
  const submissionClosesAt = addMinutes(resolvedUploadedAt, env.REEL_SUBMISSION_WINDOW_MINUTES);

  if (submissionClosesAt < new Date()) {
    return res.status(400).json({
      error: `Reels must be submitted within ${env.REEL_SUBMISSION_WINDOW_MINUTES} minutes of upload.`,
    });
  }

  const scrapedOwner = normalizeInstagramUsername(analyticsSnapshot?.ownerUsername);
  const accountOwner = normalizeInstagramUsername(req.auth!.user.instagramUsername);

  if (scrapedOwner && accountOwner && scrapedOwner !== accountOwner) {
    return res.status(400).json({
      error: `This reel belongs to @${scrapedOwner}, so it cannot be submitted from your connected account.`,
    });
  }

  const submission = await prisma.submission.create({
    data: {
      userId: req.auth!.user.id,
      campaignId: parsed.data.campaign_id,
      reelUrl: parsed.data.reel_url.trim(),
      normalizedReelUrl,
      reelCode,
      reelUploadedAt: resolvedUploadedAt,
      submissionClosesAt,
      views: analyticsSnapshot?.views ?? 0,
      playCount: analyticsSnapshot?.playCount ?? 0,
      likesCount: analyticsSnapshot?.likesCount ?? 0,
      commentsCount: analyticsSnapshot?.commentsCount ?? 0,
      analyticsSource: analyticsSnapshot?.source ?? null,
      analyticsSyncedAt: analyticsSnapshot ? new Date() : null,
      apifyDatasetItemId: analyticsSnapshot?.datasetItemId ?? null,
      earnings: calculateEarnings(analyticsSnapshot?.views ?? 0, campaign.rewardPerMillionViews),
    },
    include: {
      campaign: true,
    },
  });

  res.status(201).json(toSubmissionPayload(submission));
});

submissionsRouter.patch('/:id/refresh-analytics', async (req, res) => {
  const submission = await prisma.submission.findFirst({
    where: {
      id: req.params.id,
      userId: req.auth!.user.id,
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const quotaBeforeRefresh = getRefreshQuota(req.auth!.user);
  if (quotaBeforeRefresh.refreshesRemaining <= 0) {
    return res.status(429).json({
      error: `You have used all ${quotaBeforeRefresh.refreshLimit} analytics refreshes for this hour.`,
      refresh_limit: quotaBeforeRefresh.refreshLimit,
      refreshes_remaining: quotaBeforeRefresh.refreshesRemaining,
      window_resets_at: quotaBeforeRefresh.windowResetsAt,
    });
  }

  const result = await syncSubmissionAnalytics(submission);
  if (!result.ok) {
    return res.status(result.status).json({
      error: result.error,
      refresh_limit: quotaBeforeRefresh.refreshLimit,
      refreshes_remaining: quotaBeforeRefresh.refreshesRemaining,
      window_resets_at: quotaBeforeRefresh.windowResetsAt,
    });
  }

  const quota = consumeRefreshQuota(req.auth!.user);

  res.json({
    submission: toSubmissionPayload(result.submission),
    refresh_limit: quota.refreshLimit,
    refreshes_remaining: quota.refreshesRemaining,
    window_resets_at: quota.windowResetsAt,
  });
});
