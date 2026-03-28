import type { Campaign, Notification, Session, Submission, User, UserRole } from '@prisma/client';

type UserWithRoles = User & { roles: UserRole[] };
type SessionWithUser = Session & { user: UserWithRoles };
type AuthState = {
  session: SessionWithUser;
  user: UserWithRoles;
};
type SubmissionWithRelations = Submission & {
  campaign?: Campaign | null;
  user?: User | null;
};

export const toFrontendProfile = (user: UserWithRoles) => ({
  id: user.id,
  user_id: user.id,
  name: user.name,
  email: user.email,
  account_status: user.accountStatus,
  instagram_connection_status: user.instagramConnectionStatus,
  instagram_connected: user.instagramConnectionStatus !== 'not_connected',
  instagram_username: user.instagramUsername,
  instagram_user_id: user.instagramUserId,
  instagram_verified: user.instagramVerified,
  verification_code: user.verificationCode,
  followers_count: user.followersCount,
  created_at: user.createdAt.toISOString(),
  roles: user.roles.map(role => role.role),
});

export const toAuthPayload = (auth: AuthState | null) => {
  if (!auth) {
    return {
      user: null,
      profile: null,
      isAdmin: false,
    };
  }

  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile: toFrontendProfile(auth.user),
    isAdmin: auth.user.roles.some(role => role.role === 'admin'),
  };
};

export const toCampaignPayload = (campaign: Campaign) => ({
  id: campaign.id,
  title: campaign.title,
  description: campaign.description,
  category: campaign.category,
  reward_per_million_views: campaign.rewardPerMillionViews,
  rules: campaign.rules,
  status: campaign.status,
  image_url: campaign.imageUrl,
  created_at: campaign.createdAt.toISOString(),
  created_by_admin: campaign.createdByAdminId,
});

export const toSubmissionPayload = (submission: SubmissionWithRelations) => ({
  id: submission.id,
  campaign_id: submission.campaignId,
  user_id: submission.userId,
  reel_url: submission.reelUrl,
  status: submission.status,
  submitted_at: submission.submittedAt.toISOString(),
  reviewed_at: submission.reviewedAt?.toISOString() ?? null,
  reviewed_by_admin: submission.reviewedByAdmin ?? null,
  views: submission.views,
  earnings: Number(submission.earnings),
  campaigns: submission.campaign
    ? {
        title: submission.campaign.title,
        reward_per_million_views: submission.campaign.rewardPerMillionViews,
      }
    : null,
  profiles: submission.user
    ? {
        instagram_username: submission.user.instagramUsername,
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
