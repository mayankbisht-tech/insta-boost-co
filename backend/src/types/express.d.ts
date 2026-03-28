import type { Session, User, UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        session: Session;
        user: User & { roles: UserRole[] };
      };
    }
  }
}

export {};
