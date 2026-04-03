import type { Decimal } from '@prisma/client/runtime/library';

const NON_EARNING_STATUSES = new Set(['Rejected', 'Flagged']);

export const resolveSubmissionEarnings = (earnings: number | string | Decimal, status: string) => {
  if (NON_EARNING_STATUSES.has(status)) {
    return 0;
  }

  return Number(earnings);
};

export const calculateSubmissionEarnings = (
  views: number,
  rewardPerMillionViews: number,
  status: string,
) => {
  return resolveSubmissionEarnings(
    Number(((views / 1_000_000) * rewardPerMillionViews).toFixed(2)),
    status,
  );
};
