import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
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

  const user = await prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.upsert({
      where: { userId: req.auth!.user.id },
      update: {
        instagramUsername: username,
        instagramUserId: normalizedInstagramId,
        followersCount: parsed.data.followers_count,
        verificationCode,
        status: 'draft',
        submittedAt: null,
        reviewedAt: null,
        reviewerId: null,
        reviewNotes: null,
      },
      create: {
        userId: req.auth!.user.id,
        instagramUsername: username,
        instagramUserId: normalizedInstagramId,
        followersCount: parsed.data.followers_count,
        verificationCode,
      },
    });

    return tx.user.update({
      where: { id: req.auth!.user.id },
      data: {
        instagramConnectionStatus: 'code_generated',
        instagramUserId: normalizedInstagramId,
        instagramUsername: username,
        followersCount: parsed.data.followers_count,
        verificationCode,
        instagramVerified: false,
        instagramReviewSubmittedAt: null,
        instagramReviewReviewedAt: null,
        instagramReviewNotes: null,
      },
      include: { roles: true },
    });
  });

  res.json({
    verification_code: verificationCode,
    profile: toFrontendProfile(user),
  });
});

profileRouter.post('/instagram/submit', async (req, res) => {
  const existingRequest = await prisma.instagramVerificationRequest.findUnique({
    where: { userId: req.auth!.user.id },
  });

  if (!existingRequest) {
    return res.status(400).json({ error: 'Generate a verification code first.' });
  }

  const user = await prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.update({
      where: { userId: req.auth!.user.id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewerId: null,
        reviewNotes: null,
      },
    });

    return tx.user.update({
      where: { id: req.auth!.user.id },
      data: {
        instagramConnectionStatus: 'approval_pending',
        instagramReviewSubmittedAt: new Date(),
        instagramReviewReviewedAt: null,
        instagramReviewNotes: null,
      },
      include: { roles: true },
    });
  });

  res.json({ profile: toFrontendProfile(user) });
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
