import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { startInstagramVerification, runInstagramVerificationCheck, normalizeVerificationStatus } from '../lib/instagramVerification.js';
import { toFrontendProfile } from '../lib/serializers.js';

export const profileRouter = Router();

const instagramSchema = z.object({
  instagram_username: z.string().trim().min(1),
  followers_count: z.coerce.number().int().min(0),
});

const generateVerificationCode = () =>
  `VK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

profileRouter.use(requireAuth);

profileRouter.patch('/instagram', async (req, res) => {
  const parsed = instagramSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid Instagram profile data.' });
  }

  const username = parsed.data.instagram_username.replace(/^@/, '');
  const normalizedInstagramId = username.toLowerCase();
  const verificationCode = generateVerificationCode();

  const existingOwner = await prisma.user.findFirst({
    where: {
      instagramUserId: normalizedInstagramId,
      NOT: { id: req.auth!.user.id },
    },
    select: { id: true },
  });

  if (existingOwner) {
    return res.status(409).json({ error: 'This Instagram account is already linked.' });
  }

  const user = await startInstagramVerification({
    userId: req.auth!.user.id,
    instagramUsername: username,
    instagramUserId: normalizedInstagramId,
    followersCount: parsed.data.followers_count,
    verificationCode,
  });

  res.json({
    verification_code: verificationCode,
    profile: toFrontendProfile(user),
  });
});

profileRouter.post('/instagram/verify', async (req, res) => {
  const result = await runInstagramVerificationCheck({
    userId: req.auth!.user.id,
    allowEarlyCheck: true,
  });

  if (!result.ok) {
    return res.status(400).json({ error: result.error, next_check_at: result.nextCheckAt?.toISOString() ?? null });
  }

  res.json({ status: result.status });
});

profileRouter.get('/instagram/request', async (req, res) => {
  const request = await prisma.instagramVerificationRequest.findUnique({
    where: { userId: req.auth!.user.id },
  });

  if (!request) {
    return res.json({ request: null });
  }

  res.json({
    request: {
      id: request.id,
      instagram_username: request.instagramUsername,
      instagram_user_id: request.instagramUserId,
      followers_count: request.followersCount,
      verification_code: request.verificationCode,
      status: normalizeVerificationStatus(request.status),
      submitted_at: request.submittedAt?.toISOString() ?? null,
      expires_at: request.expiresAt?.toISOString() ?? null,
      checked_at: request.checkedAt?.toISOString() ?? null,
      checked_bio: request.checkedBio ?? null,
      checked_followers: request.checkedFollowers ?? null,
      bio_contains_token: request.bioContainsToken ?? null,
      followers_match: request.followersMatch ?? null,
      reviewed_at: request.reviewedAt?.toISOString() ?? null,
      review_notes: request.reviewNotes ?? null,
    },
  });
});

profileRouter.delete('/instagram', async (req, res) => {
  const user = await prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.deleteMany({
      where: { userId: req.auth!.user.id },
    });

    return tx.user.update({
      where: { id: req.auth!.user.id },
      data: {
        instagramConnectionStatus: 'not_connected',
        instagramUserId: null,
        instagramUsername: null,
        followersCount: 0,
        verificationCode: null,
        instagramVerified: false,
        instagramReviewSubmittedAt: null,
        instagramReviewReviewedAt: null,
        instagramReviewNotes: null,
      },
      include: { roles: true },
    });
  });

  res.json({ profile: toFrontendProfile(user) });
});
