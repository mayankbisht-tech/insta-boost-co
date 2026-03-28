import type { NextFunction, Request, Response } from 'express';
import { resolveSession } from '../lib/session.js';
import { env } from '../config/env.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const session = await resolveSession(req.cookies?.[env.SESSION_COOKIE_NAME]);

  if (!session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  req.auth = {
    session,
    user: session.user,
  };

  next();
};
