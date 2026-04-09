-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'paused', 'suspended', 'banned');

-- CreateEnum
CREATE TYPE "InstagramConnectionStatus" AS ENUM ('not_connected', 'code_generated', 'approval_pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('admin', 'superadmin', 'user');

-- CreateEnum
CREATE TYPE "InstagramVerificationStatus" AS ENUM ('draft', 'pending', 'verified', 'failed', 'expired', 'submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'active',
    "instagramConnectionStatus" "InstagramConnectionStatus" NOT NULL DEFAULT 'not_connected',
    "instagramUsername" TEXT,
    "instagramUserId" TEXT,
    "instagramVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "instagramReviewSubmittedAt" TIMESTAMP(3),
    "instagramReviewReviewedAt" TIMESTAMP(3),
    "instagramReviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAdminCredential" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "issuedByUserId" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingAdminCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramUsername" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "connectionStatus" "InstagramConnectionStatus" NOT NULL DEFAULT 'code_generated',
    "instagramVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "reviewSubmittedAt" TIMESTAMP(3),
    "reviewReviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AppRole" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSignupOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSignupOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoginActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramVerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramUsername" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "status" "InstagramVerificationStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "checkedBio" TEXT,
    "checkedFollowers" INTEGER,
    "bioContainsToken" BOOLEAN,
    "followersMatch" BOOLEAN,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "budgetRupees" INTEGER NOT NULL DEFAULT 0,
    "rupeesPerThousandViews" INTEGER NOT NULL DEFAULT 0,
    "rewardPerMillionViews" INTEGER NOT NULL DEFAULT 100,
    "rules" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Active',
    "imageUrl" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "reelUrl" TEXT NOT NULL,
    "normalizedReelUrl" TEXT,
    "reelCode" TEXT,
    "reelUploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionClosesAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "views" INTEGER NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "analyticsSource" TEXT,
    "analyticsSyncedAt" TIMESTAMP(3),
    "apifyDatasetItemId" TEXT,
    "rejectionReason" TEXT,
    "earnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdmin" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_instagramUserId_key" ON "User"("instagramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingAdminCredential_email_key" ON "PendingAdminCredential"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingAdminCredential_claimedByUserId_key" ON "PendingAdminCredential"("claimedByUserId");

-- CreateIndex
CREATE INDEX "PendingAdminCredential_issuedByUserId_createdAt_idx" ON "PendingAdminCredential"("issuedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PendingAdminCredential_claimedAt_idx" ON "PendingAdminCredential"("claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_instagramUserId_key" ON "InstagramAccount"("instagramUserId");

-- CreateIndex
CREATE INDEX "InstagramAccount_userId_createdAt_idx" ON "InstagramAccount"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InstagramAccount_userId_connectionStatus_idx" ON "InstagramAccount"("userId", "connectionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_userId_instagramUserId_key" ON "InstagramAccount"("userId", "instagramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SignupOtp_email_key" ON "SignupOtp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSignupOtp_email_key" ON "AdminSignupOtp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramVerificationRequest_userId_key" ON "InstagramVerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "InstagramVerificationRequest_status_idx" ON "InstagramVerificationRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_normalizedReelUrl_key" ON "Submission"("normalizedReelUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_reelCode_key" ON "Submission"("reelCode");

-- CreateIndex
CREATE INDEX "Submission_userId_submittedAt_idx" ON "Submission"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "Submission_campaignId_submittedAt_idx" ON "Submission"("campaignId", "submittedAt");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- AddForeignKey
ALTER TABLE "PendingAdminCredential" ADD CONSTRAINT "PendingAdminCredential_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAdminCredential" ADD CONSTRAINT "PendingAdminCredential_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLoginActivity" ADD CONSTRAINT "AdminLoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramVerificationRequest" ADD CONSTRAINT "InstagramVerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramVerificationRequest" ADD CONSTRAINT "InstagramVerificationRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

