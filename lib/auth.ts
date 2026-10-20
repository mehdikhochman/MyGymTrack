import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from './db';

export const COOKIE = 'gym_session';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export type User = {
  id: number; email: string; name: string; goal: string; experience: string; days_per_week: number;
  equipment: string; sex: string | null; birth_year: number | null; height_cm: number | null; onboarded: boolean;
};

// ---------- Passwords (scrypt, salted) ----------

const KEY_LEN = 32;
const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((ok, ko) => scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? ko(e) : ok(k))));

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64url')}$${(await derive(password, salt)).toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash ?? '', 'base64url');
  const actual = await derive(password, Buffer.from(salt ?? '', 'base64url'));
  return expected.length === KEY_LEN && timingSafeEqual(actual, expected);
}

// Same cost as a real check, so a login with an unknown email takes as long as a wrong password.
const DUMMY = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const verifyOrWaste = (password: string, stored?: string) => verifyPassword(password, stored ?? DUMMY).then((ok) => ok && !!stored);

export const passwordError = (p: string) =>
  p.length < 8 ? 'Le mot de passe doit faire au moins 8 caractères.' : p.length > 200 ? 'Mot de passe trop long.' : null;

// ---------- Sessions: random token in an httpOnly cookie, its hash in the database ----------

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

export async function startSession(uid: number) {
  const token = newToken();
  await sql`delete from auth_sessions where user_id = ${uid} and expires_at < now()`;
  await sql`insert into auth_sessions (id, user_id, expires_at) values (${sha256(token)}, ${uid}, now() + interval '90 days')`;
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: MAX_AGE, path: '/' });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from auth_sessions where id = ${sha256(token)}`;
  jar.delete(COOKIE);
}

// Once per request.
export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [u] = await sql`
    select u.id, u.email, u.name, u.goal, u.experience, u.days_per_week, u.equipment, u.sex, u.birth_year, u.height_cm, u.onboarded
    from auth_sessions s join users u on u.id = s.user_id
    where s.id = ${sha256(token)} and s.expires_at > now()`;
  return (u as User) ?? null;
});

// Pages: the signed-in user, sent to the login page or the onboarding first if needed.
export async function requireUser({ onboarding = false } = {}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!user.onboarded && !onboarding) redirect('/bienvenue');
  return user;
}

// Server actions and API routes can be called directly, so each one checks the session itself.
export async function userId() {
  const user = await currentUser();
  if (!user) throw new Error('Non autorisé');
  return user.id;
}

// ---------- Rate limiting ----------

export async function clientIp() {
  return (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}

// Records an attempt and says whether `key` already reached `max` attempts within `seconds`.
export async function limited(key: string, max: number, seconds: number) {
  const [r] = await sql`
    with added as (insert into rate_events (key) values (${key}))
    select count(*)::int as n from rate_events where key = ${key} and at > now() - make_interval(secs => ${seconds})`;
  if (Math.random() < 0.02) await sql`delete from rate_events where at < now() - interval '2 days'`;
  return r.n >= max;
}
