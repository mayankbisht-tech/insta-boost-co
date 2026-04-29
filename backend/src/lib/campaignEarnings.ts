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
  userId: string;
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
      userId: true,
      earnings: true,
      views: true,
      campaign: {
        select: {
          maxEarningRupees: true,
        },
      },
    },
  }) as ApprovedSubmissionRow[];

  const perCampaignUser = new Map<string, {
    campaignId: string;
    totalEarnings: number;
    billedViews: number;
    maxEarningRupees: number;
  }>();

  for (const row of rows) {
    const key = `${row.campaignId}:${row.userId}`;
    const current = perCampaignUser.get(key) ?? {
      campaignId: row.campaignId,
      totalEarnings: 0,
      billedViews: 0,
      maxEarningRupees: row.campaign.maxEarningRupees,
    };

    current.totalEarnings += Number(row.earnings ?? 0);
    current.billedViews += row.views;
    current.maxEarningRupees = row.campaign.maxEarningRupees;
    perCampaignUser.set(key, current);
  }

  return Array.from(perCampaignUser.values()).reduce(
    (summary, row) => ({
      spentBudgetRupees: summary.spentBudgetRupees + Math.min(row.totalEarnings, row.maxEarningRupees),
      billedViews: summary.billedViews + row.billedViews,
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
      userId: true,
      earnings: true,
      views: true,
      campaign: {
        select: {
          maxEarningRupees: true,
        },
      },
    },
  }) as ApprovedSubmissionRow[];

  const perCampaignUser = new Map<string, {
    campaignId: string;
    totalEarnings: number;
    billedViews: number;
    maxEarningRupees: number;
  }>();

  for (const row of rows) {
    const key = `${row.campaignId}:${row.userId}`;
    const current = perCampaignUser.get(key) ?? {
      campaignId: row.campaignId,
      totalEarnings: 0,
      billedViews: 0,
      maxEarningRupees: row.campaign.maxEarningRupees,
    };

    current.totalEarnings += Number(row.earnings ?? 0);
    current.billedViews += row.views;
    current.maxEarningRupees = row.campaign.maxEarningRupees;
    perCampaignUser.set(key, current);
  }

  const totalsByCampaign = new Map<string, CampaignSpendSummary>();

  for (const row of perCampaignUser.values()) {
    const current = totalsByCampaign.get(row.campaignId) ?? { billedViews: 0, spentBudgetRupees: 0 };
    current.billedViews += row.billedViews;
    current.spentBudgetRupees += Math.min(row.totalEarnings, row.maxEarningRupees);
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
  const [campaignSummary, userSummary] = await Promise.all([
    sumApprovedSubmissionEarnings({
      campaignId: args.campaign.id,
      ...submissionExclusion,
    }),
    sumApprovedSubmissionEarnings({
      campaignId: args.campaign.id,
      userId: args.userId,
      ...submissionExclusion,
    }),
  ]);

  const campaignRemaining = Math.max(args.campaign.budgetRupees - campaignSummary.spentBudgetRupees, 0);
  const userRemaining = Math.max(args.campaign.maxEarningRupees - userSummary.spentBudgetRupees, 0);

  return Number(Math.max(Math.min(rawEarnings, campaignRemaining, userRemaining), 0).toFixed(2));
};
