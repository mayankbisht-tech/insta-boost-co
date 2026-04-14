import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { resolveSubmissionEarnings } from '../lib/submissionEarnings.js';
import { requireAuth } from '../middleware/auth.js';

export const paymentsRouter = Router();

const paymentProfileSchema = z.object({
  upi_id: z.string().trim().min(3).max(120),
  full_name: z.string().trim().min(2).max(120),
  phone_number: z.string().trim().min(8).max(20),
});

const payoutRequestSchema = z.object({
  confirm: z.boolean().optional().default(true),
});

const isMissingTableError = (error: unknown, table: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2021' &&
  typeof error.meta?.table === 'string' &&
  error.meta.table === `public.${table}`;

const safeFindPaymentProfile = async (userId: string) => {
  try {
    return await prisma.paymentProfile.findUnique({
      where: { userId },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PaymentProfile')) {
      return null;
    }

    throw error;
  }
};

const safeFindPendingPayoutRequest = async (userId: string) => {
  try {
    return await prisma.payoutRequest.findFirst({
      where: { userId, status: 'pending' },
      orderBy: { requestedAt: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return null;
    }

    throw error;
  }
};

const safeFindPayoutHistory = async (userId: string) => {
  try {
    return await prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        requestedAt: true,
        reviewedAt: true,
        rejectionReason: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return [];
    }

    throw error;
  }
};

const calculateUserEarnings = async (userId: string) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId },
      select: { earnings: true, status: true },
    });

    return submissions.reduce(
      (sum, submission) => sum + resolveSubmissionEarnings(submission.earnings, submission.status),
      0,
    );
  } catch (error) {
    if (isMissingTableError(error, 'Submission')) {
      return 0;
    }

    throw error;
  }
};

const calculateTotalPaid = async (userId: string) => {
  try {
    const payouts = await prisma.payoutRequest.findMany({
      where: { userId, status: 'approved' },
      select: { amount: true },
    });

    return payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return 0;
    }

    throw error;
  }
};

const calculateReservedPayoutAmount = async (userId: string) => {
  try {
    const payouts = await prisma.payoutRequest.findMany({
      where: { userId, status: { in: ['pending', 'approved'] } },
      select: { amount: true },
    });

    return payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
  } catch (error) {
    if (isMissingTableError(error, 'PayoutRequest')) {
      return 0;
    }

    throw error;
  }
};

paymentsRouter.use(requireAuth);

paymentsRouter.get('/profile', async (req, res) => {
  const profile = await safeFindPaymentProfile(req.auth!.user.id);

  if (!profile) {
    return res.json({ profile: null });
  }

  return res.json({
    profile: {
      id: profile.id,
      upi_id: profile.upiId,
      full_name: profile.fullName,
      phone_number: profile.phoneNumber,
      status: profile.status,
      reviewed_at: profile.reviewedAt?.toISOString() ?? null,
      review_notes: profile.reviewNotes ?? null,
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    },
  });
});

paymentsRouter.put('/profile', async (req, res) => {
  const parsed = paymentProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payment profile data.', details: parsed.error.flatten().fieldErrors });
  }

  try {
    const profile = await prisma.paymentProfile.upsert({
      where: { userId: req.auth!.user.id },
      update: {
        upiId: parsed.data.upi_id,
        fullName: parsed.data.full_name,
        phoneNumber: parsed.data.phone_number,
        status: 'pending',
        reviewedAt: null,
        reviewNotes: null,
      },
      create: {
        userId: req.auth!.user.id,
        upiId: parsed.data.upi_id,
        fullName: parsed.data.full_name,
        phoneNumber: parsed.data.phone_number,
        status: 'pending',
      },
    });

    return res.json({
      profile: {
        id: profile.id,
        upi_id: profile.upiId,
        full_name: profile.fullName,
        phone_number: profile.phoneNumber,
        status: profile.status,
        reviewed_at: profile.reviewedAt?.toISOString() ?? null,
        review_notes: profile.reviewNotes ?? null,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      },
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

paymentsRouter.get('/overview', async (req, res) => {
  const [profile, totalEarnings, totalPaid, reservedPayoutAmount, pendingRequest] = await Promise.all([
    safeFindPaymentProfile(req.auth!.user.id),
    calculateUserEarnings(req.auth!.user.id),
    calculateTotalPaid(req.auth!.user.id),
    calculateReservedPayoutAmount(req.auth!.user.id),
    safeFindPendingPayoutRequest(req.auth!.user.id),
  ]);

  const available = Math.max(totalEarnings - reservedPayoutAmount, 0);

  return res.json({
    available_balance: Number(available.toFixed(2)),
    total_earned: Number(totalEarnings.toFixed(2)),
    total_paid: Number(totalPaid.toFixed(2)),
    payment_profile_status: profile?.status ?? null,
    pending_request: pendingRequest
      ? {
          id: pendingRequest.id,
          amount: Number(pendingRequest.amount),
          status: pendingRequest.status,
          requested_at: pendingRequest.requestedAt.toISOString(),
        }
      : null,
  });
});

paymentsRouter.get('/history', async (req, res) => {
  const history = await safeFindPayoutHistory(req.auth!.user.id);

  return res.json(
    history.map(item => ({
      id: item.id,
      amount: Number(item.amount),
      status: item.status,
      requested_at: item.requestedAt.toISOString(),
      reviewed_at: item.reviewedAt?.toISOString() ?? null,
      rejection_reason: item.rejectionReason ?? null,
    })),
  );
});

paymentsRouter.post('/withdraw', async (req, res) => {
  const parsed = payoutRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid withdrawal request.' });
  }

  const profile = await safeFindPaymentProfile(req.auth!.user.id);

  if (!profile) {
    return res.status(400).json({ error: 'Please add your UPI details before requesting a payout.' });
  }

  if (profile.status !== 'verified') {
    return res.status(400).json({ error: 'Your payment details must be verified by admin before requesting a payout.' });
  }

  const pending = await safeFindPendingPayoutRequest(req.auth!.user.id);

  if (pending) {
    return res.status(409).json({ error: 'A payout request is already pending.' });
  }

  const [totalEarnings, totalPaid] = await Promise.all([
    calculateUserEarnings(req.auth!.user.id),
    calculateTotalPaid(req.auth!.user.id),
  ]);

  const available = Math.max(totalEarnings - totalPaid, 0);

  if (available <= 0) {
    return res.status(400).json({ error: 'No available balance to withdraw yet.' });
  }

  try {
    const payout = await prisma.payoutRequest.create({
      data: {
        userId: req.auth!.user.id,
        amount: available,
        status: 'pending',
        upiIdSnapshot: profile.upiId,
        fullNameSnapshot: profile.fullName,
        phoneSnapshot: profile.phoneNumber,
      },
    });

    return res.status(201).json({
      request: {
        id: payout.id,
        amount: Number(payout.amount),
        status: payout.status,
        requested_at: payout.requestedAt.toISOString(),
      },
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
