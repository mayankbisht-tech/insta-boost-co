import { AppRole, Prisma } from '@prisma/client';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { canSendEmail, sendSignupOtpEmail } from '../lib/email.js';
import { generateOtp, hashOtp } from '../lib/otp.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { toAuthPayload } from '../lib/serializers.js';
import { attachSessionCookie, clearSessionCookie, createSession, resolveSession, revokeSession } from '../lib/session.js';
import { addMinutes } from '../utils/time.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

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

authRouter.post('/signup/send-otp', async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid signup data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
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
});

authRouter.post('/signup/verify-otp', async (req, res) => {
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
});

authRouter.post('/signup/complete', async (req, res) => {
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
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const matches = await verifyPassword(user.passwordHash, password);
  if (!matches) {
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

  return res.json({
    message: 'Logged in successfully.',
    user: publicUser(user),
  });
});

authRouter.post('/admin/signup/send-otp', async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid signup data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email } = parsed.data;
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email,
      roles: {
        some: { role: AppRole.admin },
      },
    },
  });

  if (existingAdmin) {
    return res.status(409).json({ error: 'An admin account with this email already exists.' });
  }

  const existingOtp = await prisma.adminSignupOtp.findUnique({ where: { email } });
  if (existingOtp && Date.now() - existingOtp.updatedAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
  }

  const otp = generateOtp(env.OTP_LENGTH);
  await prisma.adminSignupOtp.upsert({
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
});

authRouter.post('/admin/signup/verify-otp', async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid OTP data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, otp } = parsed.data;
  const record = await prisma.adminSignupOtp.findUnique({ where: { email } });

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
    await prisma.adminSignupOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    return res.status(400).json({ error: 'Invalid OTP.' });
  }

  await prisma.adminSignupOtp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return res.json({ message: 'OTP verified successfully.' });
});

authRouter.post('/admin/signup/complete', async (req, res) => {
  const parsed = completeSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid signup completion data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, name, password } = parsed.data;
  const record = await prisma.adminSignupOtp.findUnique({ where: { email } });

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
        role: AppRole.admin,
      },
    });

    await tx.adminSignupOtp.delete({
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

  await logAdminLoginActivity({
    userId: user.id,
    email: user.email,
    success: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return res.status(201).json({
    message: 'Admin account created successfully.',
    user: publicUser(user),
  });
});

authRouter.post('/admin/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login data.', details: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    await logAdminLoginActivity({
      email,
      success: false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(401).json({ error: 'Invalid admin email or password.' });
  }

  const matches = await verifyPassword(user.passwordHash, password);
  const isAdmin = user.roles.some(role => role.role === AppRole.admin);

  if (!matches || !isAdmin) {
    await logAdminLoginActivity({
      userId: user.id,
      email,
      success: false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(401).json({ error: 'Invalid admin email or password.' });
  }

  if (user.accountStatus !== 'active') {
    return res.status(403).json({ error: 'Account is not active.' });
  }

  const sessionToken = await createSession(user.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  attachSessionCookie(res, sessionToken);

  await logAdminLoginActivity({
    userId: user.id,
    email,
    success: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return res.json({
    message: 'Admin logged in successfully.',
    user: publicUser(user),
  });
});

authRouter.post('/logout', async (req, res) => {
  await revokeSession(req.cookies?.[env.SESSION_COOKIE_NAME]);
  clearSessionCookie(res);
  return res.json({ message: 'Logged out successfully.' });
});

authRouter.get('/me', async (req, res) => {
  const session = await resolveSession(req.cookies?.[env.SESSION_COOKIE_NAME]);

  if (!session) {
    return res.json(toAuthPayload(null));
  }

  return res.json(toAuthPayload({
    session,
    user: session.user,
  }));
});

authRouter.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({ error: error.message });
  }

  if (error instanceof Error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Unexpected server error.' });
});
