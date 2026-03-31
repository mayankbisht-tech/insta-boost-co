import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter =
  env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
    : null;

export const canSendEmail = Boolean(transporter && env.OTP_FROM_EMAIL);

export const sendSignupOtpEmail = async (to: string, otp: string, ttlMinutes: number) => {
  if (!transporter || !env.OTP_FROM_EMAIL) {
    throw new Error('Email provider is not configured');
  }

  const info = await transporter.sendMail({
    from: env.OTP_FROM_EMAIL,
    to,
    subject: 'Your signup OTP',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your Go Clips signup code</h2>
        <p>Use this OTP to continue creating your account:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in ${ttlMinutes} minutes.</p>
      </div>
    `,
    text: `Your Go Clips signup code is ${otp}. This code expires in ${ttlMinutes} minutes.`,
  });

  if (!info.messageId) {
    throw new Error('Failed to send OTP email: provider did not return a message id.');
  }
};
