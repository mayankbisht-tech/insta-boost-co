import { AppRole, Prisma } from '@prisma/client';
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { canSendEmail, sendPasswordResetOtpEmail, sendSignupOtpEmail } from '../lib/email.js';
import { generateOtp, hashOtp } from '../lib/otp.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { toAuthPayload } from '../lib/serializers.js';
import { attachSessionCookie, clearSessionCookie, createSession, resolveSession, revokeSession } from '../lib/session.js';
import { addMinutes } from '../utils/time.js';

export const authRouter = Router();

const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const emailSchema = z.string().trim().email().transform(value => value.toLowerCase());
const passwordSchema = z.string().min(6);

const sendOtpSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120),
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().min(env.OTP_LENGTH).max(env.OTP_LENGTH).transform(value => value.toUpperCase()),
});

const completeSignupSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120),
  password: passwordSchema,
});

const passwordResetSendSchema = z.object({
  email: emailSchema,
});

const passwordResetVerifySchema = z.object({
  email: emailSchema,
  otp: z.string().trim().min(env.OTP_LENGTH).max(env.OTP_LENGTH).transform(value => value.toUpperCase()),
});

const passwordResetCompleteSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const logAdminLoginActivity = async (params: {
  userId?: string;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}) => {
  await prisma.adminLoginActivity.create({
    data: {
      userId: params.userId,
      email: params.email,
      success: params.success,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
};

const isLocalOrigin = (origin: string | undefined) => {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const publicUser = (user: {
  id: string;
  email: string;
  name: string;
  accountStatus: string;
  instagramConnectionStatus: string;
  roles: { role: AppRole }[];
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  accountStatus: user.accountStatus,
  instagramConnectionStatus: user.instagramConnectionStatus,
  roles: user.roles.map(role => role.role),
});

const hasAdminAccess = (roles: { role: AppRole }[]) =>
  roles.some(role => role.role === AppRole.admin || role.role === AppRole.superadmin);

const isMissingTableError = (error: unknown, table: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2021' &&
  typeof error.meta?.table === 'string' &&
  error.meta.table === `public.${table}`;

const findPendingAdminCredential = (email: string) =>
  prisma.pendingAdminCredential.findUnique({
    where: { email },
  }).catch(error => {
    if (isMissingTableError(error, 'PendingAdminCredential')) {
      return null;
    }

    throw error;
  });

const claimPendingAdminCredential = async (params: {
  existingUserId?: string;
  email: string;
  password: string;
}) => {
  const pendingCredential = await findPendingAdminCredential(params.email);
  if (!pendingCredential || pendingCredential.claimedAt) {
    return null;
  }

  const matches = await verifyPassword(pendingCredential.passwordHash, params.password);
  if (!matches) {
    return null;
  }

  return prisma.$transaction(async tx => {
    let userId = params.existingUserId;

    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: pendingCredential.passwordHash,
          accountStatus: 'active',
          name: pendingCredential.name,
        },
      });
    } else {
      const createdUser = await tx.user.create({
        data: {
          email: pendingCredential.email,
          name: pendingCredential.name,
          passwordHash: pendingCredential.passwordHash,
          accountStatus: 'active',
        },
      });
      userId = createdUser.id;
    }

    await tx.userRole.upsert({
      where: {
        userId_role: {
          userId,
          role: AppRole.admin,
        },
      },
      update: {},
      create: {
        userId,
        role: AppRole.admin,
      },
    });

    await tx.pendingAdminCredential.update({
      where: { id: pendingCredential.id },
      data: {
        claimedByUserId: userId,
        claimedAt: new Date(),
      },
    });

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: true },
    });
  });
};

const getOtpValidationError = (record: { expiresAt: Date; attempts: number; otpHash: string }, otp: string) => {
  if (record.expiresAt.getTime() < Date.now()) {
    return 'OTP expired. Request a new OTP.';
  }

  if (record.attempts >= 5) {
    return 'Too many invalid attempts. Request a new OTP.';
  }

  if (hashOtp(otp) !== record.otpHash) {
    return 'Invalid OTP.';
  }

  return null;
};

authRouter.post('/signup/send-otp', asyncHandler(async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid signup data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const pendingAdminCredential = await findPendingAdminCredential(email);
  if (pendingAdminCredential && !pendingAdminCredential.claimedAt) {
    return res.status(409).json({
      error: 'This email has been reserved for admin access. Please log in with the credentials shared by the superadmin.',
    });
  }

  const existingOtp = await prisma.signupOtp.findUnique({ where: { email } });
  if (
    existingOtp &&
    Date.now() - existingOtp.updatedAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
  }

  const otp = generateOtp(env.OTP_LENGTH);
  await prisma.signupOtp.upsert({
    where: { email },
    update: {
      otpHash: hashOtp(otp),
      expiresAt: addMinutes(new Date(), env.OTP_TTL_MINUTES),
      verifiedAt: null,
      attempts: 0,
    },
    create: {
      email,
      otpHash: hashOtp(otp),
      expiresAt: addMinutes(new Date(), env.OTP_TTL_MINUTES),
    },
  });

  const allowDevOtp = isLocalOrigin(req.get('origin'));

  if (canSendEmail) {
    await sendSignupOtpEmail(email, otp, env.OTP_TTL_MINUTES);
    return res.json({ message: 'OTP sent successfully.' });
  }

  if (!allowDevOtp) {
    return res.status(500).json({ error: 'Email provider is not configured.' });
  }

  return res.json({
    message: 'OTP generated for local development.',
    devOtp: otp,
  });
}));

authRouter.post('/password-reset/send-otp', asyncHandler(async (req, res) => {
  const parsed = passwordResetSendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid password reset data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.json({ message: 'If an account exists for this email, a password reset OTP has been sent.' });
  }

  const existingOtp = await prisma.passwordResetOtp.findUnique({ where: { email } });
  if (
    existingOtp &&
    Date.now() - existingOtp.updatedAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
  }

  const otp = generateOtp(env.OTP_LENGTH);
  await prisma.passwordResetOtp.upsert({
    where: { email },
    update: {
      otpHash: hashOtp(otp),
      expiresAt: addMinutes(new Date(), env.OTP_TTL_MINUTES),
      verifiedAt: null,
      attempts: 0,
    },
    create: {
      email,
      otpHash: hashOtp(otp),
      expiresAt: addMinutes(new Date(), env.OTP_TTL_MINUTES),
    },
  });

  const allowDevOtp = isLocalOrigin(req.get('origin'));

  if (canSendEmail) {
    await sendPasswordResetOtpEmail(email, otp, env.OTP_TTL_MINUTES);
    return res.json({ message: 'If an account exists for this email, a password reset OTP has been sent.' });
  }

  if (!allowDevOtp) {
    return res.status(500).json({ error: 'Email provider is not configured.' });
  }

  return res.json({
    message: 'Password reset OTP generated for local development.',
    devOtp: otp,
  });
}));

authRouter.post('/password-reset/verify-otp', asyncHandler(async (req, res) => {
  const parsed = passwordResetVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid OTP data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, otp } = parsed.data;
  const record = await prisma.passwordResetOtp.findUnique({ where: { email } });

  if (!record) {
    return res.status(404).json({ error: 'OTP not found. Request a new OTP.' });
  }

  const validationError = getOtpValidationError(record, otp);
  if (validationError) {
    if (validationError === 'Invalid OTP.') {
      await prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    }

    return res.status(validationError === 'Invalid OTP.' ? 400 : validationError.includes('Too many') ? 429 : 400).json({ error: validationError });
  }

  await prisma.passwordResetOtp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return res.json({ message: 'OTP verified successfully.' });
}));

authRouter.post('/password-reset/complete', asyncHandler(async (req, res) => {
  const parsed = passwordResetCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid password reset completion data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;
  const record = await prisma.passwordResetOtp.findUnique({ where: { email } });

  if (!record) {
    return res.status(404).json({ error: 'OTP verification record not found.' });
  }

  if (!record.verifiedAt) {
    return res.status(400).json({ error: 'Verify your OTP first.' });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'OTP expired. Request a new OTP.' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const passwordHash = await hashPassword(password);

  const updatedUser = await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { email },
      data: { passwordHash },
    });

    await tx.passwordResetOtp.delete({
      where: { id: record.id },
    });

    await tx.session.deleteMany({
      where: { userId: user.id },
    });

    return tx.user.findUniqueOrThrow({
      where: { email },
      include: { roles: true },
    });
  });

  const sessionToken = await createSession(updatedUser.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  attachSessionCookie(res, sessionToken);

  return res.json({
    message: 'Password reset successfully.',
    user: publicUser(updatedUser),
  });
}));

authRouter.post('/signup/verify-otp', asyncHandler(async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid OTP data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, otp } = parsed.data;
  const record = await prisma.signupOtp.findUnique({ where: { email } });

  if (!record) {
    return res.status(404).json({ error: 'OTP not found. Request a new OTP.' });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'OTP expired. Request a new OTP.' });
  }

  if (record.attempts >= 5) {
    return res.status(429).json({ error: 'Too many invalid attempts. Request a new OTP.' });
  }

  if (hashOtp(otp) !== record.otpHash) {
    await prisma.signupOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    return res.status(400).json({ error: 'Invalid OTP.' });
  }

  await prisma.signupOtp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return res.json({ message: 'OTP verified successfully.' });
}));

authRouter.post('/signup/complete', asyncHandler(async (req, res) => {
  const parsed = completeSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid signup completion data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, name, password } = parsed.data;
  const record = await prisma.signupOtp.findUnique({ where: { email } });

  if (!record) {
    return res.status(404).json({ error: 'OTP verification record not found.' });
  }

  if (!record.verifiedAt) {
    return res.status(400).json({ error: 'Verify your OTP first.' });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'OTP expired. Request a new OTP.' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const pendingAdminCredential = await findPendingAdminCredential(email);
  if (pendingAdminCredential && !pendingAdminCredential.claimedAt) {
    return res.status(409).json({
      error: 'This email has been reserved for admin access. Please log in with the credentials shared by the superadmin.',
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async tx => {
    const createdUser = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    await tx.userRole.create({
      data: {
        userId: createdUser.id,
        role: AppRole.user,
      },
    });

    await tx.signupOtp.delete({
      where: { id: record.id },
    });

    return tx.user.findUniqueOrThrow({
      where: { id: createdUser.id },
      include: { roles: true },
    });
  });

  const sessionToken = await createSession(user.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  attachSessionCookie(res, sessionToken);

  return res.status(201).json({
    message: 'Account created successfully.',
    user: publicUser(user),
  });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  let user = existingUser;
  let matchedExistingPassword = false;
  if (user) {
    matchedExistingPassword = await verifyPassword(user.passwordHash, password);
  }
  let claimedAdminCredential = false;

  if (!matchedExistingPassword) {
    const claimedUser = await claimPendingAdminCredential({
      existingUserId: user?.id,
      email,
      password,
    });

    if (claimedUser) {
      user = claimedUser;
      claimedAdminCredential = true;
    }
  }

  const authenticated = matchedExistingPassword || claimedAdminCredential;

  if (!user || !authenticated) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.accountStatus !== 'active') {
    return res.status(403).json({ error: 'Account is not active.' });
  }

  const sessionToken = await createSession(user.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  attachSessionCookie(res, sessionToken);

  if (hasAdminAccess(user.roles)) {
    await logAdminLoginActivity({
      userId: user.id,
      email: user.email,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  return res.json({
    message: 'Logged in successfully.',
    user: publicUser(user),
  });
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
  await revokeSession(req.cookies?.[env.SESSION_COOKIE_NAME]);
  clearSessionCookie(res);
  return res.json({ message: 'Logged out successfully.' });
}));

authRouter.get('/me', asyncHandler(async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });

  let session = null;
  try {
    session = await resolveSession(req.cookies?.[env.SESSION_COOKIE_NAME]);
  } catch (error) {
    // If DB schema is behind (missing session/profile-related tables or columns),
    // treat the request as unauthenticated instead of surfacing a 400.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    ) {
      return res.json(toAuthPayload(null));
    }

    throw error;
  }

  if (!session) {
    return res.json(toAuthPayload(null));
  }

  return res.json(toAuthPayload({
    session,
    user: session.user,
  }));
}));

authRouter.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({ error: error.message });
  }

  if (error instanceof Error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Unexpected server error.' });
});
