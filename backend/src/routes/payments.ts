import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { getUserEndedCampaignApprovedEarnings } from '../lib/campaignEarnings.js';
import { prisma } from '../lib/prisma.js';
import { resolveSubmissionEarnings } from '../lib/submissionEarnings.js';
import { requireAuth } from '../middleware/auth.js';

export const paymentsRouter = Router();

const paymentProfileSchema = z.object({
  upi_id: z.string().trim().min(3).max(120),
  full_name: z.string().trim().min(2).max(120),
  phone_number: z.string().trim().min(8).max(20),
  ethereum_wallet_address: z
    .string()
    .trim()
    .optional()
    .refine(
      val => !val || /^0x[0-9a-fA-F]{40}$/.test(val),
      { message: 'Invalid Ethereum wallet address. Must be 0x followed by 40 hex characters.' },
    ),
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

const calculatePendingPayoutAmount = async (userId: string) => {
  try {
    const payout = await prisma.payoutRequest.findFirst({
      where: { userId, status: 'pending' },
      select: { amount: true },
    });

    return Number(payout?.amount ?? 0);
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
      ethereum_wallet_address: profile.ethereumWalletAddress ?? null,
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
        ethereumWalletAddress: parsed.data.ethereum_wallet_address ?? null,
        status: 'pending',
        reviewedAt: null,
        reviewNotes: null,
      },
      create: {
        userId: req.auth!.user.id,
        upiId: parsed.data.upi_id,
        fullName: parsed.data.full_name,
        phoneNumber: parsed.data.phone_number,
        ethereumWalletAddress: parsed.data.ethereum_wallet_address ?? null,
        status: 'pending',
      },
    });

    return res.json({
      profile: {
        id: profile.id,
        upi_id: profile.upiId,
        full_name: profile.fullName,
        phone_number: profile.phoneNumber,
        ethereum_wallet_address: profile.ethereumWalletAddress ?? null,
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
  const [profile, totalEarnings, totalPaid, pendingPayoutAmount, pendingRequest] = await Promise.all([
    safeFindPaymentProfile(req.auth!.user.id),
    getUserEndedCampaignApprovedEarnings(req.auth!.user.id),
    calculateTotalPaid(req.auth!.user.id),
    calculatePendingPayoutAmount(req.auth!.user.id),
    safeFindPendingPayoutRequest(req.auth!.user.id),
  ]);

  const estimated = Math.max(totalEarnings - totalPaid - pendingPayoutAmount, 0);

  return res.json({
    available_balance: Number(estimated.toFixed(2)),
    estimated_earning: Number(estimated.toFixed(2)),
    total_earned: Number(totalPaid.toFixed(2)),
    total_paid: Number(totalPaid.toFixed(2)),
    payment_profile_status: profile?.status ?? null,
    total_reel_earnings: Number(totalEarnings.toFixed(2)),
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
    getUserEndedCampaignApprovedEarnings(req.auth!.user.id),
    calculateTotalPaid(req.auth!.user.id),
  ]);

  const available = Math.max(totalEarnings - totalPaid, 0);
  const hasPreviousPayout = totalPaid > 0;
  const minimumWithdrawal = hasPreviousPayout ? 0 : 500;

  if (available <= minimumWithdrawal) {
    return res.status(400).json({
      error: hasPreviousPayout
        ? 'You need more approved earnings before you can request another payout.'
        : 'You can request a payout only after your estimated earnings exceed INR 500.',
    });
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



