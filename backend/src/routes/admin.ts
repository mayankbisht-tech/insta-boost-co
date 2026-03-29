import { AppRole, type InstagramVerificationRequest, type User, type UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireSuperadmin } from '../middleware/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toCampaignPayload, toFrontendProfile, toSubmissionPayload } from '../lib/serializers.js';

export const adminRouter = Router();

type UserWithRolesAndVerification = User & {
  roles: UserRole[];
  instagramVerificationRequest: InstagramVerificationRequest | null;
};

const campaignSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  reward_per_million_views: z.coerce.number().int().min(0),
  rules: z.array(z.string().trim()).default([]),
  status: z.string().trim().min(1),
  image_url: z.string().trim().nullable().optional(),
});

const userStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'suspended', 'banned']),
});

const verificationDecisionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().trim().max(500).optional(),
});

const hasManagementRole = (roles: UserRole[]) =>
  roles.some(role => role.role === AppRole.admin || role.role === AppRole.superadmin);

const isCreator = (roles: UserRole[]) => roles.every(role => role.role === AppRole.user);

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
        status: user.instagramVerificationRequest.status,
        submitted_at: user.instagramVerificationRequest.submittedAt?.toISOString() ?? null,
        reviewed_at: user.instagramVerificationRequest.reviewedAt?.toISOString() ?? null,
        review_notes: user.instagramVerificationRequest.reviewNotes ?? null,
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
    prisma.submission.findMany({ select: { status: true } }),
    prisma.instagramVerificationRequest.count({ where: { status: 'submitted' } }),
  ]);

  res.json({
    totalUsers: visibleUsers,
    totalCampaigns,
    totalSubmissions: submissions.length,
    approved: submissions.filter(item => item.status === 'Approved').length,
    rejected: submissions.filter(item => item.status === 'Rejected').length,
    pending: submissions.filter(item => item.status === 'Pending').length,
    pendingInstagramVerifications,
  });
});

adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { instagramConnectionStatus: 'approved' },
        { roles: { some: { role: { in: [AppRole.admin, AppRole.superadmin] } } } },
      ],
    },
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

adminRouter.get('/superadmin/overview', requireSuperadmin, async (_req, res) => {
  const [users, pendingVerifications] = await Promise.all([
    prisma.user.findMany({
      include: { roles: true },
    }),
    prisma.instagramVerificationRequest.count({ where: { status: 'submitted' } }),
  ]);

  const admins = users.filter(user => hasManagementRole(user.roles)).length;
  const creators = users.filter(user => isCreator(user.roles)).length;
  const paused = users.filter(user => user.accountStatus === 'paused').length;
  const blocked = users.filter(user => user.accountStatus === 'suspended' || user.accountStatus === 'banned').length;

  res.json({
    totalUsers: users.length,
    totalAdmins: admins,
    totalCreators: creators,
    pausedUsers: paused,
    blockedUsers: blocked,
    pendingVerifications,
  });
});

adminRouter.get('/superadmin/users', requireSuperadmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    include: {
      roles: true,
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

adminRouter.patch('/superadmin/verifications/:userId', requireSuperadmin, async (req, res) => {
  const parsed = verificationDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid verification decision.' });
  }

  const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  const existingRequest = await prisma.instagramVerificationRequest.findUnique({
    where: { userId: targetUserId },
  });

  if (!existingRequest || existingRequest.status !== 'submitted') {
    return res.status(404).json({ error: 'Submitted verification request not found.' });
  }

  const now = new Date();
  const user = await prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.update({
      where: { userId: targetUserId },
      data: {
        status: parsed.data.action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: now,
        reviewerId: req.auth!.user.id,
        reviewNotes: parsed.data.notes || null,
      },
    });

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        instagramConnectionStatus: parsed.data.action === 'approve' ? 'approved' : 'rejected',
        instagramVerified: parsed.data.action === 'approve',
        instagramReviewReviewedAt: now,
        instagramReviewNotes: parsed.data.notes || null,
      },
    });

    return tx.user.findUniqueOrThrow({
      where: { id: targetUserId },
      include: {
        roles: true,
        instagramVerificationRequest: true,
      },
    });
  });

  res.json(toSuperadminUserPayload(user));
});
