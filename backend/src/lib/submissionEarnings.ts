import type { Decimal } from '@prisma/client/runtime/library';

const PAYABLE_STATUS = 'Approved';

export const resolveSubmissionEarnings = (earnings: number | string | Decimal, status: string) => {
  if (status !== PAYABLE_STATUS) {
    return 0;
  }

  return Number(earnings);
};

export const calculateSubmissionGrossEarnings = (
  views: number,
  rewardPerMillionViews: number,
) => Number(((views / 1_000_000) * rewardPerMillionViews).toFixed(2));

export const calculateSubmissionEarnings = (
  views: number,
  rewardPerMillionViews: number,
  status: string,
) => {
  return resolveSubmissionEarnings(
    calculateSubmissionGrossEarnings(views, rewardPerMillionViews),
    status,
  );
};
