import crypto from 'node:crypto';
import type { Response } from 'express';
import { addDays } from '../utils/time.js';
import { env, isProduction } from '../config/env.js';
import { prisma } from './prisma.js';

const SESSION_TTL_DAYS = 30;

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token + env.SESSION_SECRET).digest('hex');

export const createSession = async (userId: string, meta: { userAgent?: string; ipAddress?: string }) => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawToken);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: addDays(new Date(), SESSION_TTL_DAYS),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return rawToken;
};

export const attachSessionCookie = (res: Response, token: string) => {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    secure: isProduction || env.SESSION_COOKIE_SAME_SITE === 'none',
    expires: addDays(new Date(), SESSION_TTL_DAYS),
    path: '/',
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    secure: isProduction || env.SESSION_COOKIE_SAME_SITE === 'none',
    path: '/',
  });
};

export const resolveSession = async (token: string | undefined) => {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          roles: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined);

  return session;
};

export const revokeSession = async (token: string | undefined) => {
  if (!token) return;

  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
};
