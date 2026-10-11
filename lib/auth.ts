import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'gym_auth';
export const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const sign = (data: string) => createHmac('sha256', process.env.AUTH_SECRET!).update(data).digest('base64url');
const sha = (s: string) => createHash('sha256').update(s).digest();

export function passwordOk(input: string) {
  return !!process.env.APP_PASSWORD && timingSafeEqual(sha(input), sha(process.env.APP_PASSWORD));
}

// Token = "<expiry ms>.<hmac(expiry)>"
export function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function tokenOk(token?: string) {
  if (!token || !process.env.AUTH_SECRET) return false;
  const [exp, sig = ''] = token.split('.');
  return Number(exp) > Date.now() && timingSafeEqual(sha(sig), sha(sign(exp)));
}

// Server actions can be invoked from any page, so each one checks the cookie itself.
export async function guard() {
  if (!tokenOk((await cookies()).get(COOKIE)?.value)) throw new Error('Non autorisé');
}
