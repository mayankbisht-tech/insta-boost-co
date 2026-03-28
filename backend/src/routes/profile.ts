import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toFrontendProfile } from '../lib/serializers.js';

export const profileRouter = Router();

const instagramSchema = z.object({
  instagram_username: z.string().trim().min(1),
  followers_count: z.coerce.number().int().min(0),
  verification_code: z.string().trim().min(1),
});

profileRouter.use(requireAuth);

profileRouter.patch('/instagram', async (req, res) => {
  const parsed = instagramSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid Instagram profile data.' });
  }

  const username = parsed.data.instagram_username.replace(/^@/, '');

  try {
    const user = await prisma.user.update({
      where: { id: req.auth!.user.id },
      data: {
        instagramConnectionStatus: 'approval_pending',
        instagramUserId: username.toLowerCase(),
        instagramUsername: username,
        followersCount: parsed.data.followers_count,
        verificationCode: parsed.data.verification_code,
        instagramVerified: false,
      },
      include: { roles: true },
    });

    res.json({ profile: toFrontendProfile(user) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({ error: 'This Instagram account is already linked.' });
    }

    throw error;
  }
});

profileRouter.post('/instagram/submit', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.auth!.user.id },
    data: {
      instagramConnectionStatus: 'approval_pending',
    },
    include: { roles: true },
  });

  res.json({ profile: toFrontendProfile(user) });
});

profileRouter.delete('/instagram', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.auth!.user.id },
    data: {
      instagramConnectionStatus: 'not_connected',
      instagramUserId: null,
      instagramUsername: null,
      followersCount: 0,
      verificationCode: null,
      instagramVerified: false,
    },
    include: { roles: true },
  });

  res.json({ profile: toFrontendProfile(user) });
});
