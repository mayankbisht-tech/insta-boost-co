import type { Prisma } from '@prisma/client';

const MAX_USERNAME_LENGTH = 20;
const MAX_UNIQUENESS_ATTEMPTS = 50;

type UserStore = Pick<Prisma.TransactionClient, 'user'>;

const normalizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const deriveBaseUsername = (name: string, email: string) => {
  const nameBase = normalizeUsername(name);
  const emailBase = normalizeUsername(email.split('@')[0] ?? '');

  const base = nameBase.length >= 3 ? nameBase : emailBase || 'user';
  return base.slice(0, MAX_USERNAME_LENGTH) || 'user';
};

export const generateUniqueUsername = async (store: UserStore, params: { name: string; email: string }) => {
  const base = deriveBaseUsername(params.name, params.email);

  for (let attempt = 0; attempt < MAX_UNIQUENESS_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? '' : String(attempt);
    const trimmedBase = base.slice(0, Math.max(1, MAX_USERNAME_LENGTH - suffix.length));
    const candidate = `${trimmedBase}${suffix}`;

    const existing = await store.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}${Date.now().toString().slice(-6)}`;
};
