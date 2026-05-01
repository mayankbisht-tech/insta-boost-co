import { AppRole, type InstagramVerificationRequest, type PendingAdminCredential, type User, type UserRole } from '@prisma/client';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { getApifyRunOverview } from '../lib/apify.js';
import { consumeRefreshQuota, getRefreshQuota, syncSubmissionAnalytics } from '../lib/analyticsRefresh.js';
import { createNotification } from '../lib/notifications.js';
import { hashPassword } from '../lib/password.js';
import { calculateCappedSubmissionEarnings, getCampaignSpendSummaries } from '../lib/campaignEarnings.js';
import { normalizeVerificationStatus, overrideInstagramVerificationStatus, runInstagramVerificationCheck } from '../lib/instagramVerification.js';
import { prisma } from '../lib/prisma.js';
import { emitCampaignBudgetUpdate } from '../lib/realtime.js';
import { toCampaignPayload, toFrontendProfile, toSubmissionPayload } from '../lib/serializers.js';
import { resolveSubmissionEarnings } from '../lib/submissionEarnings.js';
import { requireAdmin, requireSuperadmin } from '../middleware/admin.js';
import { requireAuth } from '../middleware/auth.js';

export const adminRouter = Router();

type CampaignUploadRequest = Request & {
  fileUrl?: string;
};

type UserWithRolesAndVerification = User & {
  roles: UserRole[];
  instagramVerificationRequest: InstagramVerificationRequest | null;
};

type PendingAdminCredentialWithIssuer = PendingAdminCredential & {
  issuedBy: Pick<User, 'id' | 'name' | 'email'>;
  claimedBy: Pick<User, 'id' | 'name' | 'email'> | null;
};

const campaignSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  link: z.string().trim().optional().default(''),
  google_drive_url: z.string().trim().optional().default(''),
  category: z.string().trim().min(1),
  budget_rupees: z.coerce.number().int().min(0),
  max_earning_rupees: z.coerce.number().int().min(0).optional().default(0),
  rupees_per_thousand_views: z.coerce.number().int().min(0),
  reward_per_million_views: z.coerce.number().int().min(0).optional().default(0),
  rules: z.string().transform(v => {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [v];
    } catch {
      return [v];
    }
  }).default('[]'),
  status: z.string().trim().min(1),
});

const userStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'suspended', 'banned']),
});

const verificationDecisionSchema = z.object({
  status: z.enum(['pending', 'verified', 'failed', 'expired']),
  notes: z.string().trim().max(500).optional(),
});

const submissionStatusSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Flagged']),
  reason: z.string().trim().max(500).optional(),
});

const submissionViewsSchema = z.object({
  views: z.coerce.number().int().min(0),
});

const paymentProfileDecisionSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().trim().max(500).optional(),
});

const payoutDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(500).optional(),
});

const pendingAdminCredentialSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(6).max(120),
});

const hasManagementRole = (roles: UserRole[]) =>
  roles.some(role => role.role === AppRole.admin || role.role === AppRole.superadmin);

const isCreator = (roles: UserRole[]) => roles.every(role => role.role === AppRole.user);

const isMissingTableError = (error: unknown, table: string) =>
  error instanceof Error &&
  'code' in error &&
  (error as { code?: string }).code === 'P2021' &&
  'meta' in error &&
  typeof (error as { meta?: { table?: unknown } }).meta?.table === 'string' &&
  (error as { meta?: { table?: string } }).meta?.table === `public.${table}`;

const safePendingAdminCredentialCount = async () => {
  try {
    return await prisma.pendingAdminCredential.count({ where: { claimedAt: null } });
  } catch (error) {
    if (isMissingTableError(error, 'PendingAdminCredential')) {
      return 0;
    }

    throw error;
  }
};

const safePendingAdminCredentialFindMany = async () => {
  try {
    return await prisma.pendingAdminCredential.findMany({
      include: {
        issuedBy: {
          select: { id: true, name: true, email: true },
        },
        claimedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PendingAdminCredential')) {
      return [];
    }

    throw error;
  }
};

const safePaymentProfileFindMany = async () => {
  try {
    return await prisma.paymentProfile.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PaymentProfile')) {
      return [];
    }

    throw error;
  }
};

const safePaymentProfileFindUnique = async (id: string) => {
  try {
    return await prisma.paymentProfile.findUnique({
      where: { id },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PaymentProfile')) {
      return null;
    }

    throw error;
  }
};

const safePayoutRequestFindMany = async () => {
  try {
    return await prisma.payoutRequest.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return [];
    }

    throw error;
  }
};

const safePayoutRequestFindUnique = async (id: string) => {
  try {
    return await prisma.payoutRequest.findUnique({
      where: { id },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return null;
    }

    throw error;
  }
};

const toSuperadminUserPayload = (user: UserWithRolesAndVerification) => ({
  ...toFrontendProfile(user),
  is_creator: isCreator(user.roles),
  is_admin_account: hasManagementRole(user.roles),
  instagram_verification_request: user.instagramVerificationRequest
    ? {
        id: user.instagramVerificationRequest.id,
        instagram_username: user.instagramVerificationRequest.instagramUsername,
        instagram_user_id: user.instagramVerificationRequest.instagramUserId,
        followers_count: user.instagramVerificationRequest.followersCount,
        verification_code: user.instagramVerificationRequest.verificationCode,
        status: normalizeVerificationStatus(user.instagramVerificationRequest.status),
        submitted_at: user.instagramVerificationRequest.submittedAt?.toISOString() ?? null,
        expires_at: user.instagramVerificationRequest.expiresAt?.toISOString() ?? null,
        checked_at: user.instagramVerificationRequest.checkedAt?.toISOString() ?? null,
        checked_bio: user.instagramVerificationRequest.checkedBio ?? null,
        checked_followers: user.instagramVerificationRequest.checkedFollowers ?? null,
        bio_contains_token: user.instagramVerificationRequest.bioContainsToken ?? null,
        followers_match: user.instagramVerificationRequest.followersMatch ?? null,
        reviewed_at: user.instagramVerificationRequest.reviewedAt?.toISOString() ?? null,
        review_notes: user.instagramVerificationRequest.reviewNotes ?? null,
      }
    : null,
});

const toPendingAdminCredentialPayload = (credential: PendingAdminCredentialWithIssuer) => ({
  id: credential.id,
  name: credential.name,
  email: credential.email,
  created_at: credential.createdAt.toISOString(),
  claimed_at: credential.claimedAt?.toISOString() ?? null,
  issued_by: {
    id: credential.issuedBy.id,
    name: credential.issuedBy.name,
    email: credential.issuedBy.email,
  },
  claimed_by: credential.claimedBy
    ? {
        id: credential.claimedBy.id,
        name: credential.claimedBy.name,
        email: credential.claimedBy.email,
      }
    : null,
});

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', async (_req, res) => {
  const [visibleUsers, totalCampaigns, submissions, pendingInstagramVerifications] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [
          { instagramConnectionStatus: 'approved' },
          { roles: { some: { role: { in: [AppRole.admin, AppRole.superadmin] } } } },
        ],
      },
    }),
    prisma.campaign.count(),
    prisma.submission.findMany({
      select: {
        status: true,
        views: true,
        earnings: true,
        analyticsSyncedAt: true,
      },
    }),
    prisma.instagramVerificationRequest.count({ where: { status: { in: ['pending', 'submitted'] } } }),
  ]);

  const totalViews = submissions.reduce((sum, submission) => sum + submission.views, 0);
  const totalEarnings = submissions.reduce(
    (sum, submission) => sum + resolveSubmissionEarnings(submission.earnings, submission.status),
    0,
  );
  const approvedCount = submissions.filter(item => item.status === 'Approved').length;

  res.json({
    totalUsers: visibleUsers,
    totalCampaigns,
    totalSubmissions: submissions.length,
    approved: approvedCount,
    rejected: submissions.filter(item => item.status === 'Rejected').length,
    pending: submissions.filter(item => item.status === 'Pending').length,
    eligible: approvedCount,
    totalViews,
    totalEarnings: Number(totalEarnings.toFixed(2)),
    averageViews: submissions.length ? Math.round(totalViews / submissions.length) : 0,
    uniqueReels: submissions.length,
    reelsWithAnalytics: submissions.filter(item => item.analyticsSyncedAt).length,
    pendingInstagramVerifications,
  });
});

adminRouter.get('/users', async (_req, res) => {
  const rawQuery = typeof _req.query.q === 'string' ? _req.query.q.trim() : '';
  const users = await prisma.user.findMany({
    where: rawQuery
      ? {
          OR: [
            { name: { contains: rawQuery, mode: 'insensitive' } },
            { email: { contains: rawQuery, mode: 'insensitive' } },
            { username: { contains: rawQuery, mode: 'insensitive' } },
            { instagramUsername: { contains: rawQuery, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      roles: true,
      instagramAccounts: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users.map(toFrontendProfile));
});

adminRouter.get('/campaigns', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const summaries = await getCampaignSpendSummaries(campaigns.map(campaign => campaign.id));

  res.json(campaigns.map(campaign => toCampaignPayload(campaign, summaries.get(campaign.id) ?? { billedViews: 0, spentBudgetRupees: 0 })));
});

adminRouter.post('/campaigns', async (req, res) => {
  const uploadRequest = req as CampaignUploadRequest;
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid campaign data.' });
  }

  const campaign = await prisma.campaign.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      budgetRupees: parsed.data.budget_rupees,
      maxEarningRupees: parsed.data.max_earning_rupees,
      rupeesPerThousandViews: parsed.data.rupees_per_thousand_views,
      rewardPerMillionViews: parsed.data.rupees_per_thousand_views * 1000,
      rules: parsed.data.rules,
      status: parsed.data.status,
      imageUrl: parsed.data.link || uploadRequest.fileUrl || null,
      googleDriveUrl: parsed.data.google_drive_url || null,
      createdByAdminId: req.auth!.user.id,
    } as any,
  });

  await emitCampaignBudgetUpdate(campaign.id);

  res.status(201).json(toCampaignPayload(campaign));
});

adminRouter.put('/campaigns/:id', async (req, res) => {
  const uploadRequest = req as CampaignUploadRequest;
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid campaign data.' });
  }

  const existing = await prisma.campaign.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }

  const campaign = await prisma.campaign.update({
    where: { id: req.params.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || existing.description,
      category: parsed.data.category,
      budgetRupees: parsed.data.budget_rupees,
      maxEarningRupees: parsed.data.max_earning_rupees,
      rupeesPerThousandViews: parsed.data.rupees_per_thousand_views,
      rewardPerMillionViews: parsed.data.rupees_per_thousand_views * 1000,
      rules: parsed.data.rules,
      status: parsed.data.status,
      imageUrl: parsed.data.link || uploadRequest.fileUrl || existing.imageUrl,
      googleDriveUrl: parsed.data.google_drive_url || (existing as typeof existing & { googleDriveUrl?: string | null }).googleDriveUrl,
      createdByAdminId: req.auth!.user.id,
    } as any,
  });

  await emitCampaignBudgetUpdate(campaign.id);

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

adminRouter.get('/payments/profiles', async (_req, res) => {
  const profiles = await safePaymentProfileFindMany();

  res.json(profiles.map(profile => ({
    id: profile.id,
    user: profile.user,
    upi_id: profile.upiId,
    full_name: profile.fullName,
    phone_number: profile.phoneNumber,
    status: profile.status,
    reviewed_at: profile.reviewedAt?.toISOString() ?? null,
    review_notes: profile.reviewNotes ?? null,
    updated_at: profile.updatedAt.toISOString(),
    created_at: profile.createdAt.toISOString(),
  })));
});

adminRouter.patch('/payments/profiles/:id', async (req, res) => {
  const parsed = paymentProfileDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payment verification decision.' });
  }

  const existing = await safePaymentProfileFindUnique(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Payment profile not found.' });
  }

  try {
    const profile = await prisma.paymentProfile.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.notes ?? null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true },
        },
      },
    });

    res.json({
      id: profile.id,
      user: profile.user,
      upi_id: profile.upiId,
      full_name: profile.fullName,
      phone_number: profile.phoneNumber,
      status: profile.status,
      reviewed_at: profile.reviewedAt?.toISOString() ?? null,
      review_notes: profile.reviewNotes ?? null,
      updated_at: profile.updatedAt.toISOString(),
      created_at: profile.createdAt.toISOString(),
    });
  } catch (error) {
    if (isMissingTableError(error, 'PaymentProfile')) {
      return res.status(503).json({
        error: 'Payment profile storage is unavailable. Apply the database migrations and restart the backend.',
      });
    }

    throw error;
  }
});

adminRouter.get('/payments/payouts', async (_req, res) => {
  const payouts = await safePayoutRequestFindMany();

  res.json(payouts.map(payout => ({
    id: payout.id,
    user: payout.user,
    amount: Number(payout.amount),
    status: payout.status,
    requested_at: payout.requestedAt.toISOString(),
    reviewed_at: payout.reviewedAt?.toISOString() ?? null,
    reviewed_by_admin: payout.reviewedByAdmin ?? null,
    rejection_reason: payout.rejectionReason ?? null,
    upi_id: payout.upiIdSnapshot,
    full_name: payout.fullNameSnapshot,
    phone_number: payout.phoneSnapshot,
  })));
});

adminRouter.patch('/payments/payouts/:id', async (req, res) => {
  const parsed = payoutDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payout decision.' });
  }

  const existing = await safePayoutRequestFindUnique(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Payout request not found.' });
  }

  if (existing.status !== 'pending') {
    return res.status(409).json({ error: 'This payout request has already been processed.' });
  }

  try {
    const payout = await prisma.payoutRequest.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        reviewedAt: new Date(),
        reviewedByAdmin: req.auth!.user.id,
        rejectionReason: parsed.data.status === 'rejected' ? (parsed.data.reason ?? 'Rejected by admin') : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true },
        },
      },
    });

    res.json({
      id: payout.id,
      user: payout.user,
      amount: Number(payout.amount),
      status: payout.status,
      requested_at: payout.requestedAt.toISOString(),
      reviewed_at: payout.reviewedAt?.toISOString() ?? null,
      reviewed_by_admin: payout.reviewedByAdmin ?? null,
      rejection_reason: payout.rejectionReason ?? null,
      upi_id: payout.upiIdSnapshot,
      full_name: payout.fullNameSnapshot,
      phone_number: payout.phoneSnapshot,
    });
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return res.status(503).json({
        error: 'Payout request storage is unavailable. Apply the database migrations and restart the backend.',
      });
    }

    throw error;
  }
});

adminRouter.patch('/submissions/:id/status', async (req, res) => {
  const parsed = submissionStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid submission status.' });
  }

  const existing = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: {
      campaign: true,
      user: true,
    },
  });

  if (!existing || !existing.campaign) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const reviewNote = parsed.data.reason?.trim();
  if ((parsed.data.status === 'Rejected' || parsed.data.status === 'Flagged') && !reviewNote) {
    return res.status(400).json({ error: 'An admin note is required when rejecting or flagging a submission.' });
  }

  const rejectionReason =
    parsed.data.status === 'Rejected'
      ? reviewNote
      : parsed.data.status === 'Flagged'
      ? reviewNote
      : null;

  const earnings = await calculateCappedSubmissionEarnings({
    submissionId: existing.id,
    userId: existing.userId,
    campaign: existing.campaign,
    views: existing.views,
    status: parsed.data.status,
  });

  const submission = await prisma.submission.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      rejectionReason,
      earnings,
      reviewedAt: new Date(),
      reviewedByAdmin: req.auth!.user.id,
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  const campaignTitle = existing.campaign.title;
  const adminMessage = rejectionReason ? ` Admin note: ${rejectionReason}` : '';
  if (parsed.data.status === 'Approved') {
    await createNotification(
      submission.userId,
      `Your reel for ${campaignTitle} was approved. Current earnings: ₹${Number(submission.earnings).toFixed(2)}.`,
    );
  } else if (parsed.data.status === 'Rejected') {
    await createNotification(
      submission.userId,
      `Your reel for ${campaignTitle} was rejected. Earnings for this reel are now ₹0.00.${adminMessage}`,
    );
  } else if (parsed.data.status === 'Flagged') {
    await createNotification(
      submission.userId,
      `Your reel for ${campaignTitle} was flagged for review. Earnings for this reel are now ₹0.00.${adminMessage}`,
    );
  }

  await emitCampaignBudgetUpdate(submission.campaignId);

  res.json(toSubmissionPayload(submission));
});

adminRouter.patch('/submissions/:id/views', async (req, res) => {
  const parsed = submissionViewsSchema.safeParse(req.body);

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

  const earnings = await calculateCappedSubmissionEarnings({
    submissionId: existing.id,
    userId: existing.userId,
    campaign: existing.campaign,
    views: parsed.data.views,
    status: existing.status,
  });

  const submission = await prisma.submission.update({
    where: { id: req.params.id },
    data: {
      views: parsed.data.views,
      earnings,
      analyticsSource: 'manual-admin',
      analyticsSyncedAt: new Date(),
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  await emitCampaignBudgetUpdate(submission.campaignId);

  res.json(toSubmissionPayload(submission));
});

adminRouter.patch('/submissions/:id/sync-analytics', async (req, res) => {
  const existing = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { campaign: true, user: true },
  });

  if (!existing || !existing.campaign) {
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

  const result = await syncSubmissionAnalytics(existing);
  if (!result.ok) {
    return res.status(result.status).json({
      error: result.error,
      refresh_limit: quotaBeforeRefresh.refreshLimit,
      refreshes_remaining: quotaBeforeRefresh.refreshesRemaining,
      window_resets_at: quotaBeforeRefresh.windowResetsAt,
    });
  }

  const refreshedEarnings = await calculateCappedSubmissionEarnings({
    submissionId: result.submission.id,
    userId: result.submission.userId,
    campaign: result.submission.campaign,
    views: result.submission.views,
    status: result.submission.status,
  });

  const submission = await prisma.submission.update({
    where: { id: result.submission.id },
    data: {
      earnings: refreshedEarnings,
    },
    include: {
      campaign: true,
      user: true,
    },
  });

  const quota = consumeRefreshQuota(req.auth!.user);

  await emitCampaignBudgetUpdate(submission.campaignId);

  res.json({
    submission: toSubmissionPayload(submission),
    refresh_limit: quota.refreshLimit,
    refreshes_remaining: quota.refreshesRemaining,
    window_resets_at: quota.windowResetsAt,
  });
});

adminRouter.get('/superadmin/overview', requireSuperadmin, async (_req, res) => {
  const [users, submissions, campaigns, pendingVerifications, pendingAdminCredentials, apifyRunOverview] = await Promise.all([
    prisma.user.findMany({
      include: { roles: true },
    }),
    prisma.submission.findMany({
      select: {
        status: true,
        views: true,
        earnings: true,
        analyticsSyncedAt: true,
      },
    }),
    prisma.campaign.findMany({
      select: {
        status: true,
      },
    }),
    prisma.instagramVerificationRequest.count({ where: { status: { in: ['pending', 'submitted'] } } }),
    safePendingAdminCredentialCount(),
    getApifyRunOverview().catch(() => null),
  ]);

  const admins = users.filter(user => hasManagementRole(user.roles)).length;
  const creators = users.filter(user => isCreator(user.roles)).length;
  const paused = users.filter(user => user.accountStatus === 'paused').length;
  const blocked = users.filter(user => user.accountStatus === 'suspended' || user.accountStatus === 'banned').length;
  const connectedCreators = users.filter(user => user.instagramConnectionStatus === 'approved').length;
  const totalViews = submissions.reduce((sum, submission) => sum + submission.views, 0);
  const totalEarnings = submissions.reduce(
    (sum, submission) => sum + resolveSubmissionEarnings(submission.earnings, submission.status),
    0,
  );

  res.json({
    totalUsers: users.length,
    totalAdmins: admins,
    totalCreators: creators,
    pausedUsers: paused,
    blockedUsers: blocked,
    pendingVerifications,
    pendingAdminCredentials,
    connectedCreators,
    platformViews: totalViews,
    platformEarnings: Number(totalEarnings.toFixed(2)),
    uniqueReels: submissions.length,
    activeCampaigns: campaigns.filter(campaign => campaign.status === 'Active').length,
    reelsWithAnalytics: submissions.filter(submission => submission.analyticsSyncedAt).length,
    averageViewsPerReel: submissions.length ? Math.round(totalViews / submissions.length) : 0,
    apifyRunStatus: apifyRunOverview?.status ?? 'not-configured',
    apifyRunStartedAt: apifyRunOverview?.startedAt ?? null,
    apifyRunFinishedAt: apifyRunOverview?.finishedAt ?? null,
  });
});

adminRouter.get('/superadmin/admin-credentials', requireSuperadmin, async (_req, res) => {
  const credentials = await safePendingAdminCredentialFindMany();

  res.json(credentials.map(toPendingAdminCredentialPayload));
});

adminRouter.post('/superadmin/admin-credentials', requireSuperadmin, async (req, res) => {
  try {
    const parsed = pendingAdminCredentialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid admin credential data.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { roles: true },
    });

    if (existingUser?.roles.some(role => role.role === AppRole.superadmin)) {
      return res.status(409).json({ error: 'That email already belongs to a superadmin account.' });
    }

    if (existingUser?.roles.some(role => role.role === AppRole.admin)) {
      return res.status(409).json({ error: 'That email already has admin access.' });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const credential = await prisma.pendingAdminCredential.upsert({
      where: { email: parsed.data.email },
      update: {
        name: parsed.data.name,
        passwordHash,
        issuedByUserId: req.auth!.user.id,
        claimedAt: null,
        claimedByUserId: null,
      },
      create: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        issuedByUserId: req.auth!.user.id,
      },
      include: {
        issuedBy: {
          select: { id: true, name: true, email: true },
        },
        claimedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(toPendingAdminCredentialPayload(credential));
  } catch (error) {
    if (isMissingTableError(error, 'PendingAdminCredential')) {
      return res.status(503).json({
        error: 'Pending admin credential storage is unavailable. Apply the database migrations and restart the backend.',
      });
    }

    throw error;
  }
});

adminRouter.get('/superadmin/users', requireSuperadmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    include: {
      roles: true,
      instagramAccounts: {
        orderBy: { createdAt: 'desc' },
      },
      instagramVerificationRequest: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users.map(toSuperadminUserPayload));
});

adminRouter.patch('/superadmin/users/:id/status', requireSuperadmin, async (req, res) => {
  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid account status.' });
  }

  const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (targetUserId === req.auth!.user.id && parsed.data.status !== 'active') {
    return res.status(400).json({ error: 'You cannot restrict your own superadmin account.' });
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { accountStatus: parsed.data.status },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: targetUserId },
    include: {
      roles: true,
      instagramAccounts: {
        orderBy: { createdAt: 'desc' },
      },
      instagramVerificationRequest: true,
    },
  });

  res.json(toSuperadminUserPayload(user));
});

adminRouter.delete('/superadmin/users/:id', requireSuperadmin, async (req, res) => {
  const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (targetUserId === req.auth!.user.id) {
    return res.status(400).json({ error: 'You cannot remove your own superadmin account.' });
  }

  await prisma.user.delete({
    where: { id: targetUserId },
  });

  res.json({ message: 'User removed successfully.' });
});

adminRouter.patch('/superadmin/verifications/:userId/trigger', requireSuperadmin, async (req, res) => {
  res.status(410).json({ error: 'Instagram verification is now creator-managed and no longer requires superadmin access.' });
});

adminRouter.patch('/superadmin/verifications/:userId/status', requireSuperadmin, async (req, res) => {
  res.status(410).json({ error: 'Instagram verification is now creator-managed and no longer requires superadmin access.' });
});
