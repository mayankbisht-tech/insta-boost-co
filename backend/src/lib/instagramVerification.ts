import { InstagramVerificationStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { findApifyProfileByUsername, isApifyProfileConfigured } from './apify.js';
import { createNotification } from './notifications.js';
import { prisma } from './prisma.js';
import { addMinutes } from '../utils/time.js';

const toUserConnection = (status: InstagramVerificationStatus) => {
  if (status === 'verified') {
    return { instagramConnectionStatus: 'approved' as const, instagramVerified: true };
  }

  if (status === 'pending') {
    return { instagramConnectionStatus: 'approval_pending' as const, instagramVerified: false };
  }

  if (status === 'draft') {
    return { instagramConnectionStatus: 'code_generated' as const, instagramVerified: false };
  }

  return { instagramConnectionStatus: 'rejected' as const, instagramVerified: false };
};

export const normalizeVerificationStatus = (status: InstagramVerificationStatus): InstagramVerificationStatus => {
  if (status === 'submitted') return 'pending';
  if (status === 'approved') return 'verified';
  if (status === 'rejected') return 'failed';
  return status;
};

type VerificationResult =
  | { ok: true; status: InstagramVerificationStatus }
  | { ok: false; error: string; nextCheckAt?: Date };

export const startInstagramVerification = async (params: {
  userId: string;
  instagramUsername: string;
  instagramUserId: string;
  verificationCode: string;
}) => {
  const now = new Date();
  const expiresAt = addMinutes(now, env.INSTAGRAM_VERIFICATION_WINDOW_MINUTES);

  return prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.upsert({
      where: { userId: params.userId },
      update: {
        instagramUsername: params.instagramUsername,
        instagramUserId: params.instagramUserId,
        followersCount: 0,
        verificationCode: params.verificationCode,
        status: 'draft',
        submittedAt: null,
        expiresAt,
        checkedAt: null,
        checkedBio: null,
        checkedFollowers: null,
        bioContainsToken: null,
        followersMatch: null,
        reviewedAt: null,
        reviewerId: null,
        reviewNotes: null,
      },
      create: {
        userId: params.userId,
        instagramUsername: params.instagramUsername,
        instagramUserId: params.instagramUserId,
        followersCount: 0,
        verificationCode: params.verificationCode,
        status: 'draft',
        submittedAt: null,
        expiresAt,
      },
    });

    return tx.user.update({
      where: { id: params.userId },
      data: {
        instagramConnectionStatus: 'code_generated',
        instagramUserId: params.instagramUserId,
        instagramUsername: params.instagramUsername,
        followersCount: 0,
        verificationCode: params.verificationCode,
        instagramVerified: false,
        instagramReviewSubmittedAt: null,
        instagramReviewReviewedAt: null,
        instagramReviewNotes: 'Verification code generated. Run the check after updating your Instagram bio.',
      },
      include: { roles: true },
    });
  });
};

export const runInstagramVerificationCheck = async (params: {
  userId: string;
  allowEarlyCheck: boolean;
  reviewerId?: string | null;
}): Promise<VerificationResult> => {
  const request = await prisma.instagramVerificationRequest.findUnique({
    where: { userId: params.userId },
  });

  if (!request) {
    return { ok: false, error: 'Verification request not found.' };
  }

  if (!isApifyProfileConfigured()) {
    return { ok: false, error: 'Apify profile dataset is not configured yet.' };
  }

  const now = new Date();

  const normalizedStatus = normalizeVerificationStatus(request.status);

  if (normalizedStatus === 'verified') {
    return { ok: true, status: 'verified' };
  }

  const profile = await findApifyProfileByUsername(request.instagramUsername);

  const bio = profile?.bio ?? null;
  const followers = profile?.followers ?? null;
  const bioContainsToken = bio ? bio.includes(request.verificationCode) : false;
  const followersMatch = followers !== null;

  let status: InstagramVerificationStatus = 'failed';
  if (bioContainsToken) {
    status = 'verified';
  } else if (request.expiresAt && now > request.expiresAt) {
    status = 'expired';
  }

  const userStatus = toUserConnection(status);

  await prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.update({
      where: { userId: params.userId },
      data: {
        status,
        submittedAt: now,
        followersCount: followers ?? request.followersCount,
        checkedAt: now,
        checkedBio: bio,
        checkedFollowers: followers,
        bioContainsToken,
        followersMatch,
        reviewedAt: status === 'verified' || status === 'failed' || status === 'expired' ? now : null,
        reviewerId: params.reviewerId ?? null,
        reviewNotes: status === 'verified' ? 'Auto-verified via Apify.' : null,
      },
    });

    await tx.user.update({
      where: { id: params.userId },
      data: {
        instagramConnectionStatus: userStatus.instagramConnectionStatus,
        instagramVerified: userStatus.instagramVerified,
        followersCount: followers ?? request.followersCount,
        instagramReviewSubmittedAt: now,
        instagramReviewReviewedAt: now,
        instagramReviewNotes:
          status === 'failed'
            ? 'Verification code was not found in the Instagram bio.'
            : status === 'expired'
            ? 'Verification window expired.'
            : 'Instagram account verified automatically.',
      },
    });
  });

  if (status === 'verified') {
    await createNotification(params.userId, 'Instagram account verified successfully. You can now submit reels directly.');
  } else if (status === 'failed') {
    await createNotification(
      params.userId,
      'Instagram verification failed because the verification code was not found in the Instagram bio.',
    );
  } else if (status === 'expired') {
    await createNotification(
      params.userId,
      'Instagram verification expired. Generate a new code and try again.',
    );
  }

  return { ok: true, status };
};

export const overrideInstagramVerificationStatus = async (params: {
  userId: string;
  status: InstagramVerificationStatus;
  reviewerId?: string | null;
  notes?: string | null;
}) => {
  const now = new Date();
  const expiresAt =
    params.status === 'pending' ? addMinutes(now, env.INSTAGRAM_VERIFICATION_WINDOW_MINUTES) : null;
  const userStatus = toUserConnection(params.status);

  await prisma.$transaction(async tx => {
    await tx.instagramVerificationRequest.update({
      where: { userId: params.userId },
      data: {
        status: params.status,
        submittedAt: params.status === 'pending' ? now : undefined,
        expiresAt,
        reviewedAt: now,
        reviewerId: params.reviewerId ?? null,
        reviewNotes: params.notes ?? null,
      },
    });

    await tx.user.update({
      where: { id: params.userId },
      data: {
        instagramConnectionStatus: params.status === 'pending' ? 'code_generated' : userStatus.instagramConnectionStatus,
        instagramVerified: userStatus.instagramVerified,
        instagramReviewReviewedAt: params.status === 'pending' ? null : now,
        instagramReviewNotes: params.status === 'pending' ? null : (params.notes ?? null),
        instagramReviewSubmittedAt: params.status === 'pending' ? now : undefined,
      },
    });
  });
};
