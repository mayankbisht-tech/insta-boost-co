import type { NextFunction, Request, Response } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.auth?.user.roles.some(role => role.role === 'admin' || role.role === 'superadmin');

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
};

export const requireSuperadmin = (req: Request, res: Response, next: NextFunction) => {
  const isSuperadmin = req.auth?.user.roles.some(role => role.role === 'superadmin');

  if (!isSuperadmin) {
    return res.status(403).json({ error: 'Superadmin access required.' });
  }

  next();
};
