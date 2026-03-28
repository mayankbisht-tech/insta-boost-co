import type { NextFunction, Request, Response } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.auth?.user.roles.some(role => role.role === 'admin');

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
};
