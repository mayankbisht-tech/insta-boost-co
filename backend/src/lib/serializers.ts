import type { Campaign, InstagramAccount, Notification, Session, Submission, User, UserRole } from '@prisma/client';
import { resolveSubmissionEarnings } from './submissionEarnings.js';

type UserWithRoles = User & { roles: UserRole[]; instagramAccounts?: InstagramAccount[] };
type SessionWithUser = Session & { user: UserWithRoles };
type AuthState = {
  session: SessionWithUser;
  user: UserWithRoles;
};
type SubmissionWithRelations = Submission & {
  campaign?: Campaign | null;
  user?: (User & { instagramAccounts?: InstagramAccount[] }) | null;
};

type FrontendInstagramAccount = {
  id: string;
  instagram_username: string;
  instagram_user_id: string;
  instagram_connection_status: User['instagramConnectionStatus'];
  instagram_verified: boolean;
  verification_code: string | null;
  followers_count: number;
  instagram_review_submitted_at: string | null;
  instagram_review_reviewed_at: string | null;
  instagram_review_notes: string | null;
  created_at: string;
};

const buildLegacyInstagramAccount = (user: Pick<
  User,
  | 'id'
  | 'instagramConnectionStatus'
  | 'instagramUsername'
  | 'instagramUserId'
  | 'instagramVerified'
  | 'verificationCode'
  | 'followersCount'
  | 'instagramReviewSubmittedAt'
  | 'instagramReviewReviewedAt'
  | 'instagramReviewNotes'
  | 'createdAt'
>): FrontendInstagramAccount | null => {
  if (!user.instagramUsername || !user.instagramUserId) {
    return null;
  }

  return {
    id: `legacy-${user.id}`,
    instagram_username: user.instagramUsername,
    instagram_user_id: user.instagramUserId,
    instagram_connection_status: user.instagramConnectionStatus,
    instagram_verified: user.instagramVerified,
    verification_code: user.verificationCode,
    followers_count: user.followersCount,
    instagram_review_submitted_at: user.instagramReviewSubmittedAt?.toISOString() ?? null,
    instagram_review_reviewed_at: user.instagramReviewReviewedAt?.toISOString() ?? null,
    instagram_review_notes: user.instagramReviewNotes ?? null,
    created_at: user.createdAt.toISOString(),
  };
};

const getFrontendInstagramAccounts = (user: UserWithRoles): FrontendInstagramAccount[] => {
  const accounts = (user.instagramAccounts ?? []).map(account => ({
    id: account.id,
    instagram_username: account.instagramUsername,
    instagram_user_id: account.instagramUserId,
    instagram_connection_status: account.connectionStatus,
    instagram_verified: account.instagramVerified,
    verification_code: account.verificationCode,
    followers_count: account.followersCount,
    instagram_review_submitted_at: account.reviewSubmittedAt?.toISOString() ?? null,
    instagram_review_reviewed_at: account.reviewReviewedAt?.toISOString() ?? null,
    instagram_review_notes: account.reviewNotes ?? null,
    created_at: account.createdAt.toISOString(),
  }));

  const legacyAccount = buildLegacyInstagramAccount(user);
  if (
    legacyAccount &&
    !accounts.some(account =>
      account.instagram_user_id === legacyAccount.instagram_user_id
      || account.instagram_username.toLowerCase() === legacyAccount.instagram_username.toLowerCase(),
    )
  ) {
    accounts.push(legacyAccount);
  }

  return accounts;
};

const getPrimaryInstagramAccount = (user: UserWithRoles) =>
  getFrontendInstagramAccounts(user).find(account => account.instagram_connection_status === 'approved')
  ?? getFrontendInstagramAccounts(user)[0]
  ?? null;

export const toFrontendProfile = (user: UserWithRoles) => {
  const primaryAccount = getPrimaryInstagramAccount(user);
  const connectedAccounts = getFrontendInstagramAccounts(user);

  return {
    id: user.id,
    user_id: user.id,
    name: user.name,
    email: user.email,
    account_status: user.accountStatus,
    instagram_connection_status: primaryAccount?.instagram_connection_status ?? user.instagramConnectionStatus,
    instagram_connected: connectedAccounts.some(account => account.instagram_connection_status === 'approved'),
    instagram_username: primaryAccount?.instagram_username ?? user.instagramUsername,
    instagram_user_id: primaryAccount?.instagram_user_id ?? user.instagramUserId,
    instagram_verified: primaryAccount?.instagram_verified ?? user.instagramVerified,
    verification_code: primaryAccount?.verification_code ?? user.verificationCode,
    followers_count: primaryAccount?.followers_count ?? user.followersCount,
    instagram_review_submitted_at: user.instagramReviewSubmittedAt?.toISOString() ?? null,
    instagram_review_reviewed_at: user.instagramReviewReviewedAt?.toISOString() ?? null,
    instagram_review_notes: user.instagramReviewNotes ?? null,
    instagram_accounts: connectedAccounts,
    created_at: user.createdAt.toISOString(),
    roles: user.roles.map(role => role.role),
  };
};

export const toAuthPayload = (auth: AuthState | null) => {
  if (!auth) {
    return {
      user: null,
      profile: null,
      isAdmin: false,
      isSuperadmin: false,
    };
  }

  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile: toFrontendProfile(auth.user),
    isAdmin: auth.user.roles.some(role => role.role === 'admin' || role.role === 'superadmin'),
    isSuperadmin: auth.user.roles.some(role => role.role === 'superadmin'),
  };
};

const resolveRupeesPerThousandViews = (campaign: Campaign) => {
  if (campaign.rupeesPerThousandViews > 0) {
    return campaign.rupeesPerThousandViews;
  }

  return Number((campaign.rewardPerMillionViews / 1000).toFixed(2));
};

const calculateCampaignBudgetMetrics = (campaign: Campaign, billedViews: number) => {
  const rupeesPerThousandViews = resolveRupeesPerThousandViews(campaign);
  const spentBudgetRupees = Number(((billedViews / 1000) * rupeesPerThousandViews).toFixed(2));
  const remainingBudgetRupees = Number(Math.max(campaign.budgetRupees - spentBudgetRupees, 0).toFixed(2));
  const budgetConsumedPercent = campaign.budgetRupees > 0
    ? Number(Math.min((spentBudgetRupees / campaign.budgetRupees) * 100, 100).toFixed(2))
    : 0;

  return {
    rupeesPerThousandViews,
    spentBudgetRupees,
    remainingBudgetRupees,
    budgetConsumedPercent,
  };
};

export const toCampaignPayload = (campaign: Campaign, billedViews = 0) => {
  const metrics = calculateCampaignBudgetMetrics(campaign, billedViews);

  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    budget_rupees: campaign.budgetRupees,
    rupees_per_thousand_views: metrics.rupeesPerThousandViews,
    reward_per_million_views: campaign.rewardPerMillionViews,
    billed_views: billedViews,
    spent_budget_rupees: metrics.spentBudgetRupees,
    remaining_budget_rupees: metrics.remainingBudgetRupees,
    budget_consumed_percent: metrics.budgetConsumedPercent,
    rules: campaign.rules,
    status: campaign.status,
    image_url: campaign.imageUrl,
    created_at: campaign.createdAt.toISOString(),
    created_by_admin: campaign.createdByAdminId,
  };
};

export const toSubmissionPayload = (submission: SubmissionWithRelations) => ({
  id: submission.id,
  campaign_id: submission.campaignId,
  user_id: submission.userId,
  reel_url: submission.reelUrl,
  normalized_reel_url: submission.normalizedReelUrl ?? null,
  reel_code: submission.reelCode ?? null,
  reel_uploaded_at: submission.reelUploadedAt.toISOString(),
  submission_closes_at: submission.submissionClosesAt.toISOString(),
  status: submission.status,
  rejection_reason: submission.rejectionReason ?? null,
  submitted_at: submission.submittedAt.toISOString(),
  reviewed_at: submission.reviewedAt?.toISOString() ?? null,
  reviewed_by_admin: submission.reviewedByAdmin ?? null,
  views: submission.views,
  play_count: submission.playCount,
  likes_count: submission.likesCount,
  comments_count: submission.commentsCount,
  analytics_source: submission.analyticsSource ?? null,
  analytics_synced_at: submission.analyticsSyncedAt?.toISOString() ?? null,
  earnings: resolveSubmissionEarnings(submission.earnings, submission.status),
  campaigns: submission.campaign
    ? {
        title: submission.campaign.title,
        reward_per_million_views: submission.campaign.rewardPerMillionViews,
      }
    : null,
  profiles: submission.user
    ? {
        instagram_username: getPrimaryInstagramAccount({
          ...submission.user,
          roles: [],
        })?.instagram_username ?? submission.user.instagramUsername,
        name: submission.user.name,
        email: submission.user.email,
      }
    : null,
});

export const toNotificationPayload = (notification: Notification) => ({
  id: notification.id,
  user_id: notification.userId,
  message: notification.message,
  read: notification.read,
  created_at: notification.createdAt.toISOString(),
});
