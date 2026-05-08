import type { Campaign } from '@prisma/client';
import { prisma } from './prisma.js';
import { calculateSubmissionGrossEarnings } from './submissionEarnings.js';

type CampaignEarningSource = Pick<Campaign, 'id' | 'budgetRupees' | 'maxEarningRupees' | 'rewardPerMillionViews'>;

export type CampaignSpendSummary = {
  billedViews: number;
  spentBudgetRupees: number;
};

type ApprovedSubmissionRow = {
  campaignId: string;
  earnings: unknown;
  views: number;
  campaign: {
    maxEarningRupees: number;
  };
};

const sumApprovedSubmissionEarnings = async (where: Record<string, unknown>) => {
  const rows = await prisma.submission.findMany({
    where: {
      ...where,
      status: 'Approved',
    },
    select: {
      campaignId: true,
      earnings: true,
      views: true,
      campaign: {
        select: {
          maxEarningRupees: true,
        },
      },
    },
  }) as ApprovedSubmissionRow[];

  return rows.reduce(
    (summary, row) => ({
      spentBudgetRupees: summary.spentBudgetRupees + Math.min(Number(row.earnings ?? 0), row.campaign.maxEarningRupees),
      billedViews: summary.billedViews + row.views,
    }),
    { spentBudgetRupees: 0, billedViews: 0 },
  );
};

const sumCappedApprovedSubmissionEarningsByCampaign = async (campaignIds: string[]) => {
  if (campaignIds.length === 0) {
    return new Map<string, CampaignSpendSummary>();
  }

  const rows = await prisma.submission.findMany({
    where: {
      campaignId: { in: campaignIds },
      status: 'Approved',
    },
    select: {
      campaignId: true,
      earnings: true,
      views: true,
      campaign: {
        select: {
          maxEarningRupees: true,
        },
      },
    },
  }) as ApprovedSubmissionRow[];

  const totalsByCampaign = new Map<string, CampaignSpendSummary>();

  for (const row of rows) {
    const current = totalsByCampaign.get(row.campaignId) ?? { billedViews: 0, spentBudgetRupees: 0 };
    current.billedViews += row.views;
    current.spentBudgetRupees += Math.min(Number(row.earnings ?? 0), row.campaign.maxEarningRupees);
    totalsByCampaign.set(row.campaignId, current);
  }

  return totalsByCampaign;
};

export const getCampaignSpendSummary = async (campaignId: string): Promise<CampaignSpendSummary> => {
  const summaries = await sumCappedApprovedSubmissionEarningsByCampaign([campaignId]);
  return summaries.get(campaignId) ?? { billedViews: 0, spentBudgetRupees: 0 };
};

export const getCampaignSpendSummaries = async (campaignIds: string[]) => {
  return await sumCappedApprovedSubmissionEarningsByCampaign(campaignIds);
};

export const getUserCappedApprovedEarnings = async (userId: string) => {
  const summary = await sumApprovedSubmissionEarnings({ userId });
  return Number(summary.spentBudgetRupees.toFixed(2));
};

export const getUserEndedCampaignApprovedEarnings = async (userId: string) => {
  const summary = await sumApprovedSubmissionEarnings({
    userId,
    campaign: {
      is: {
        status: { not: 'Active' },
      },
    },
  });

  return Number(summary.spentBudgetRupees.toFixed(2));
};

export const calculateCappedSubmissionEarnings = async (args: {
  submissionId?: string;
  userId: string;
  campaign: CampaignEarningSource;
  views: number;
  status: string;
}) => {
  if (args.status !== 'Approved') {
    return 0;
  }

  const rawEarnings = calculateSubmissionGrossEarnings(args.views, args.campaign.rewardPerMillionViews);

  const submissionExclusion = args.submissionId ? { id: { not: args.submissionId } } : {};
  const campaignSummary = await sumApprovedSubmissionEarnings({
    campaignId: args.campaign.id,
    ...submissionExclusion,
  });

  const campaignRemaining = Math.max(args.campaign.budgetRupees - campaignSummary.spentBudgetRupees, 0);
  const reelMaxPayment = Math.max(args.campaign.maxEarningRupees, 0);

  return Number(Math.max(Math.min(rawEarnings, campaignRemaining, reelMaxPayment), 0).toFixed(2));
};
