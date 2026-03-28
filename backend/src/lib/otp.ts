import crypto from 'node:crypto';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateOtp = (length: number) => {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
};

export const hashOtp = (otp: string) =>
  crypto.createHash('sha256').update(otp).digest('hex');
