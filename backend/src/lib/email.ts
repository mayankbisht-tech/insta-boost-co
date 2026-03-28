import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const canSendEmail = Boolean(env.RESEND_API_KEY && env.OTP_FROM_EMAIL);

export const sendSignupOtpEmail = async (to: string, otp: string, ttlMinutes: number) => {
  if (!resend || !env.OTP_FROM_EMAIL) {
    throw new Error('Email provider is not configured');
  }

  await resend.emails.send({
    from: env.OTP_FROM_EMAIL,
    to,
    subject: 'Your signup OTP',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your Viralkaro signup code</h2>
        <p>Use this OTP to continue creating your account:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in ${ttlMinutes} minutes.</p>
      </div>
    `,
  });
};
