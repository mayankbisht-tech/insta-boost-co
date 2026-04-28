import type { Campaign } from '@prisma/client';
import { prisma } from './prisma.js';
import { calculateSubmissionGrossEarnings } from './submissionEarnings.js';

type CampaignEarningSource = Pick<Campaign, 'id' | 'budgetRupees' | 'maxEarningRupees' | 'rewardPerMillionViews'>;

export type CampaignSpendSummary = {
  billedViews: number;
  spentBudgetRupees: number;
};

const sumApprovedSubmissionEarnings = async (where: Record<string, unknown>) => {
  const aggregate = await prisma.submission.aggregate({
    where: {
      ...where,
      status: 'Approved',
    },
    _sum: {
      earnings: true,
      views: true,
    },
  });

  return {
    spentBudgetRupees: Number(aggregate._sum.earnings ?? 0),
    billedViews: aggregate._sum.views ?? 0,
  };
};

export const getCampaignSpendSummary = async (campaignId: string): Promise<CampaignSpendSummary> => {
  return await sumApprovedSubmissionEarnings({ campaignId });
};

export const getCampaignSpendSummaries = async (campaignIds: string[]) => {
  if (campaignIds.length === 0) {
    return new Map<string, CampaignSpendSummary>();
  }

  const rows = await prisma.submission.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: { in: campaignIds },
      status: 'Approved',
    },
    _sum: {
      earnings: true,
      views: true,
    },
  });

  return new Map(
    rows.map(row => [
      row.campaignId,
      {
        billedViews: row._sum.views ?? 0,
        spentBudgetRupees: Number(row._sum.earnings ?? 0),
      },
    ]),
  );
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
