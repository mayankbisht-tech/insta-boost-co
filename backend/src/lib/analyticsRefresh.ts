import type { Submission, User, UserRole } from '@prisma/client';
import { refreshApifyAnalyticsForReelUrl } from './apify.js';
import { prisma } from './prisma.js';
import { calculateSubmissionEarnings } from './submissionEarnings.js';

type SubmissionWithRelations = Submission & {
  campaign: {
    rewardPerMillionViews: number;
  } | null;
  user?: User | null;
};

type RefreshActor = Pick<User, 'id'> & {
  roles: UserRole[];
};

type RefreshWindow = {
  timestamps: number[];
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const refreshWindows = new Map<string, RefreshWindow>();

const getRefreshLimit = (actor: RefreshActor) => {
  if (actor.roles.some(role => role.role === 'superadmin')) {
    return 10;
  }

  if (actor.roles.some(role => role.role === 'admin')) {
    return 5;
  }

  return 5;
};

export const getRefreshQuota = (actor: RefreshActor) => {
  const now = Date.now();
  const refreshLimit = getRefreshLimit(actor);
  const current = refreshWindows.get(actor.id);
  const timestamps = current?.timestamps.filter(timestamp => now - timestamp < ONE_HOUR_MS) ?? [];

  refreshWindows.set(actor.id, { timestamps });

  const refreshesRemaining = Math.max(0, refreshLimit - timestamps.length);
  const oldestTimestamp = timestamps[0] ?? null;
  const windowResetsAt = oldestTimestamp ? new Date(oldestTimestamp + ONE_HOUR_MS).toISOString() : null;

  return {
    refreshLimit,
    refreshesRemaining,
    windowResetsAt,
  };
};

export const consumeRefreshQuota = (actor: RefreshActor) => {
  const quota = getRefreshQuota(actor);
  if (quota.refreshesRemaining <= 0) {
    return {
      ok: false as const,
      ...quota,
    };
  }

  const current = refreshWindows.get(actor.id);
  const timestamps = current?.timestamps ?? [];
  timestamps.push(Date.now());
  refreshWindows.set(actor.id, { timestamps });

  return {
    ok: true as const,
    ...getRefreshQuota(actor),
  };
};

export const syncSubmissionAnalytics = async (submission: SubmissionWithRelations) => {
  if (!submission.campaign) {
    return { ok: false as const, status: 404, error: 'Submission not found.' };
  }

  if (!submission.reelUrl) {
    return { ok: false as const, status: 400, error: 'This submission is missing a reel URL, so analytics cannot be synced.' };
  }

  let analyticsResult;
  try {
    analyticsResult = await refreshApifyAnalyticsForReelUrl(submission.reelUrl);
  } catch {
    return { ok: false as const, status: 502, error: 'Apify analytics could not be reached right now.' };
  }

  if (analyticsResult.status === 'not-configured') {
    return { ok: false as const, status: 400, error: 'Apify reel verification is not configured on the backend.' };
  }

  if (analyticsResult.status === 'not-found') {
    return { ok: false as const, status: 404, error: 'No Apify analytics were found for this reel yet.' };
  }

  if (analyticsResult.status === 'missing-timestamp') {
    return { ok: false as const, status: 400, error: 'Apify found the reel, but its upload timestamp is still missing.' };
  }

  if (analyticsResult.status === 'invalid-timestamp') {
    return { ok: false as const, status: 400, error: 'Apify found the reel, but its upload timestamp is invalid.' };
  }

  const analytics = analyticsResult.snapshot;

  const updatedSubmission = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      reelUploadedAt: analytics.uploadedAt ?? submission.reelUploadedAt,
      views: analytics.views,
      playCount: analytics.playCount,
      likesCount: analytics.likesCount,
      commentsCount: analytics.commentsCount,
      analyticsSource: analytics.source,
      analyticsSyncedAt: new Date(),
      apifyDatasetItemId: analytics.datasetItemId,
      earnings: calculateSubmissionEarnings(
        analytics.views,
        submission.campaign.rewardPerMillionViews,
        submission.status,
      ),
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  return { ok: true as const, submission: updatedSubmission };
};
