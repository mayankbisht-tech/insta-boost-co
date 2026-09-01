import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { refreshApifyAnalyticsForReelUrl } from '../lib/apify.js';
import { consumeRefreshQuota, syncSubmissionAnalytics } from '../lib/analyticsRefresh.js';
import { calculateCappedSubmissionEarnings } from '../lib/campaignEarnings.js';
import { prisma } from '../lib/prisma.js';
import { emitCampaignBudgetUpdate } from '../lib/realtime.js';
import { extractInstagramReelCode, normalizeInstagramReelUrl, normalizeInstagramUsername } from '../lib/reels.js';
import { toSubmissionPayload } from '../lib/serializers.js';
import { calculateSubmissionEarnings, resolveSubmissionEarnings } from '../lib/submissionEarnings.js';
import { requireAuth } from '../middleware/auth.js';
import { addMinutes } from '../utils/time.js';

export const submissionsRouter = Router();

const createSubmissionSchema = z.object({
  campaign_id: z.string().min(1),
  reel_url: z.string().trim().min(1),
});

submissionsRouter.use(requireAuth);

submissionsRouter.get('/overview', async (req, res) => {
  const submissions = await prisma.submission.findMany({
    where: { userId: req.auth!.user.id },
    include: { campaign: true },
    orderBy: { submittedAt: 'desc' },
  });

  const isSubmissionCapped = (submission: any) => {
    return submission.campaign && Number(submission.earnings) >= submission.campaign.maxEarningRupees;
  };

  const totalViews = submissions.reduce((sum: number, submission: any) => {
    return sum + (isSubmissionCapped(submission) ? 0 : submission.views);
  }, 0);

  const totalEarnings = submissions.reduce(
    (sum: number, submission: any) => sum + resolveSubmissionEarnings(submission.earnings, submission.status),
    0,
  );

  const bestSubmission = submissions.reduce(
    (best: any, submission: any) => {
      if (isSubmissionCapped(submission)) return best;
      return (!best || submission.views > best.views ? submission : best);
    },
    null as any,
  );

  const latestSync = submissions.reduce((latest: Date | null, submission: any) => {
    if (!submission.analyticsSyncedAt) {
      return latest;
    }

    if (!latest || submission.analyticsSyncedAt > latest) {
      return submission.analyticsSyncedAt;
    }

    return latest;
  }, null as Date | null);

  const uncappedSubmissions = submissions.filter((s: any) => !isSubmissionCapped(s));

  res.json({
    total_submissions: submissions.length,
    approved: submissions.filter((submission: any) => submission.status === 'Approved').length,
    rejected: submissions.filter((submission: any) => submission.status === 'Rejected').length,
    pending: submissions.filter((submission: any) => submission.status === 'Pending').length,
    total_views: totalViews,
    total_earnings: Number(totalEarnings.toFixed(2)),
    average_views: uncappedSubmissions.length ? Math.round(totalViews / uncappedSubmissions.length) : 0,
    active_reels: submissions.filter((submission: any) => submission.status === 'Pending' || submission.status === 'Approved').length,
    reels_with_analytics: submissions.filter((submission: any) => Boolean(submission.analyticsSyncedAt)).length,
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
    include: {
      user: {
        include: {
          instagramAccounts: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
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
    analyticsResult = await refreshApifyAnalyticsForReelUrl(parsed.data.reel_url);
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
  const approvedOwners = req.auth!.user.instagramAccounts
    .filter((account: any) => account.connectionStatus === 'approved')
    .map((account: any) => normalizeInstagramUsername(account.instagramUsername))
    .filter((username: any): username is string => Boolean(username));
  const legacyApprovedOwner =
    req.auth!.user.instagramConnectionStatus === 'approved'
      ? normalizeInstagramUsername(req.auth!.user.instagramUsername)
      : null;
  const allowedOwners = Array.from(new Set([
    ...approvedOwners,
    ...(legacyApprovedOwner ? [legacyApprovedOwner] : []),
  ]));

  if (scrapedOwner && allowedOwners.length > 0 && !allowedOwners.includes(scrapedOwner)) {
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
      earnings: calculateSubmissionEarnings(
        analyticsSnapshot?.views ?? 0,
        campaign.rewardPerMillionViews,
        'Pending',
      ),
    },
    include: {
      campaign: true,
    },
  });

  await emitCampaignBudgetUpdate(submission.campaignId);

  res.status(201).json(toSubmissionPayload(submission));
});

submissionsRouter.patch('/:id/refresh-analytics', async (req, res) => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { campaign: true, user: true },
  });

  if (!submission || !submission.campaign) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const isAdminOrSuperadmin = req.auth!.user.roles.some(
    (role: any) => role.role === 'admin' || role.role === 'superadmin'
  );

  if (submission.userId !== req.auth!.user.id && !isAdminOrSuperadmin) {
    return res.status(403).json({ error: 'You do not have permission to refresh this submission.' });
  }

  const quota = consumeRefreshQuota(req.auth!.user);
  if (!quota.ok) {
    return res.status(429).json({
      error: `Rate limit exceeded. You can refresh again at ${quota.windowResetsAt}.`,
      refreshes_remaining: quota.refreshesRemaining,
      window_resets_at: quota.windowResetsAt,
    });
  }

  const syncResult = await syncSubmissionAnalytics(submission);
  if (!syncResult.ok) {
    return res.status(syncResult.status).json({ error: syncResult.error });
  }

  const refreshedEarnings = await calculateCappedSubmissionEarnings({
    submissionId: syncResult.submission.id,
    userId: syncResult.submission.userId,
    campaign: syncResult.submission.campaign!,
    views: syncResult.submission.views,
    status: syncResult.submission.status,
  });

  const updatedSubmission = await prisma.submission.update({
    where: { id: syncResult.submission.id },
    data: {
      earnings: refreshedEarnings,
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  res.json(toSubmissionPayload(updatedSubmission));
});
