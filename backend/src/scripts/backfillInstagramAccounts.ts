import '../config/env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  const users = await prisma.user.findMany({
    where: {
      instagramUserId: { not: null },
      instagramUsername: { not: null },
    },
    orderBy: { createdAt: 'asc' },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.instagramUserId || !user.instagramUsername) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.instagramAccount.findUnique({
      where: { instagramUserId: user.instagramUserId },
    });

    if (existing) {
      await prisma.instagramAccount.update({
        where: { instagramUserId: user.instagramUserId },
        data: {
          userId: user.id,
          instagramUsername: user.instagramUsername,
          connectionStatus: user.instagramConnectionStatus,
          instagramVerified: user.instagramVerified,
          verificationCode: user.verificationCode,
          followersCount: user.followersCount,
          reviewSubmittedAt: user.instagramReviewSubmittedAt,
          reviewReviewedAt: user.instagramReviewReviewedAt,
          reviewNotes: user.instagramReviewNotes,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.instagramAccount.create({
      data: {
        userId: user.id,
        instagramUsername: user.instagramUsername,
        instagramUserId: user.instagramUserId,
        connectionStatus: user.instagramConnectionStatus,
        instagramVerified: user.instagramVerified,
        verificationCode: user.verificationCode,
        followersCount: user.followersCount,
        reviewSubmittedAt: user.instagramReviewSubmittedAt,
        reviewReviewedAt: user.instagramReviewReviewedAt,
        reviewNotes: user.instagramReviewNotes,
        createdAt: user.createdAt,
      },
    });
    created += 1;
  }

  console.log(JSON.stringify({
    scanned: users.length,
    created,
    updated,
    skipped,
  }, null, 2));
};

run()
  .catch(error => {
    console.error('Backfill failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
