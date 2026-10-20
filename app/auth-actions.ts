'use server';

import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import {
  clientIp, currentUser, hashPassword, limited, newToken, passwordError, sha256, startSession, verifyOrWaste,
} from '@/lib/auth';
import { emailEnabled, sendEmail } from '@/lib/email';
import { nutritionTargets } from '@/lib/nutrition';
import { templatePlan } from '@/lib/plan';
import { GOALS, LEVELS, SETUPS, today } from '@/lib/config';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const email = (fd: FormData) => str(fd, 'email').toLowerCase().slice(0, 254);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public base URL for links in e-mails (never taken from the request, to prevent reset-link poisoning).
const baseUrl = () => process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);

export async function signup(_: string | undefined, fd: FormData) {
  const name = str(fd, 'name').slice(0, 40);
  const mail = email(fd);
  const password = String(fd.get('password') ?? '');
  if (!name) return 'Indique ton prénom.';
  if (!EMAIL.test(mail)) return 'Adresse e-mail invalide.';
  const bad = passwordError(password);
  if (bad) return bad;
  if (await limited(`signup:${await clientIp()}`, 5, 3600)) return 'Trop de comptes créés depuis cette connexion. Réessaie dans une heure.';

  const [user] = await sql`
    insert into users (email, password_hash, name) values (${mail}, ${await hashPassword(password)}, ${name})
    on conflict (email) do nothing returning id`;
  if (!user) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.';

  // Data of the single-user version (rows without owner) goes to OWNER_EMAIL's account,
  // or to the very first account when OWNER_EMAIL is not set.
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner ? owner === mail : true) {
    await sql.transaction(['sessions', 'meals', 'body_weight', 'settings', 'coach_reports'].map((t) =>
      sql.query(`update ${t} set user_id = $1 where user_id is null and ($2 or (select count(*) from users) = 1)`, [user.id, !!owner])));
  }
  await startSession(user.id);
  redirect('/bienvenue');
}

export async function login(_: string | undefined, fd: FormData) {
  const mail = email(fd);
  const password = String(fd.get('password') ?? '');
  if (await limited(`login:${mail}`, 10, 900) || await limited(`login-ip:${await clientIp()}`, 30, 900)) {
    return 'Trop de tentatives. Réessaie dans 15 minutes.';
  }
  const [user] = await sql`select id, password_hash from users where email = ${mail}`;
  if (!(await verifyOrWaste(password, user?.password_hash))) return 'E-mail ou mot de passe incorrect.';
  await startSession(user.id);
  redirect('/');
}

// Same answer whether the account exists or not.
export async function requestReset(_: string | undefined, fd: FormData) {
  const mail = email(fd);
  const done = 'Si un compte existe avec cet e-mail, tu vas recevoir un lien valable 1 heure.';
  if (!emailEnabled() || !baseUrl()) return 'L’envoi d’e-mails n’est pas configuré sur ce site. Contacte la personne qui l’administre.';
  if (!EMAIL.test(mail)) return 'Adresse e-mail invalide.';
  if (await limited(`reset:${mail}`, 3, 3600) || await limited(`reset-ip:${await clientIp()}`, 10, 3600)) return done;
  const [user] = await sql`select id, name from users where email = ${mail}`;
  if (user) {
    const token = newToken();
    await sql`insert into password_resets (id, user_id, expires_at) values (${sha256(token)}, ${user.id}, now() + interval '1 hour')`;
    await sendEmail(mail, 'Réinitialiser ton mot de passe MyGymTrack',
      `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n${baseUrl()}/mot-de-passe?token=${token}\n\nSi tu n’as rien demandé, ignore cet e-mail.`);
  }
  return done;
}

export async function resetPassword(_: string | undefined, fd: FormData) {
  const password = String(fd.get('password') ?? '');
  const bad = passwordError(password);
  if (bad) return bad;
  const [reset] = await sql`
    update password_resets set used = true
    where id = ${sha256(String(fd.get('token') ?? ''))} and not used and expires_at > now() returning user_id`;
  if (!reset) return 'Ce lien a expiré ou a déjà servi. Demande un nouveau lien.';
  await sql.transaction([
    sql`update users set password_hash = ${await hashPassword(password)} where id = ${reset.user_id}`,
    sql`delete from auth_sessions where user_id = ${reset.user_id}`, // signs out every device
  ]);
  await startSession(reset.user_id);
  redirect('/');
}

// Onboarding: profile → nutrition targets and a starter programme.
export async function completeOnboarding(fd: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const pick = (k: string, allowed: Record<string, unknown>, fallback: string) => (str(fd, k) in allowed ? str(fd, k) : fallback);
  const num = (k: string, lo: number, hi: number) => {
    const n = Number(str(fd, k).replace(',', '.'));
    return n >= lo && n <= hi ? n : null;
  };
  const profile = {
    goal: pick('goal', GOALS, 'muscle'),
    experience: pick('experience', LEVELS, 'beginner'),
    equipment: pick('equipment', SETUPS, 'gym'),
    days_per_week: num('days', 2, 6) ?? 3,
    sex: str(fd, 'sex') === 'f' ? 'f' : str(fd, 'sex') === 'm' ? 'm' : null,
    birth_year: num('birth_year', 1920, new Date().getFullYear() - 13),
    height_cm: num('height', 120, 230),
  };
  const weight = num('weight', 30, 300);
  const targets = nutritionTargets(profile, weight ?? (profile.sex === 'f' ? 62 : 75));

  await sql.transaction([
    sql`update users set goal = ${profile.goal}, experience = ${profile.experience}, equipment = ${profile.equipment},
      days_per_week = ${profile.days_per_week}, sex = ${profile.sex}, birth_year = ${profile.birth_year}, height_cm = ${profile.height_cm},
      onboarded = true where id = ${user.id}`,
    ...(weight ? [sql`insert into body_weight (user_id, date, weight_kg) values (${user.id}, ${today()}, ${weight})`] : []),
    ...Object.entries(targets).map(([key, value]) => sql`
      insert into settings (user_id, key, value) values (${user.id}, ${key}, ${String(value)})
      on conflict (user_id, key) do update set value = excluded.value`),
    sql`insert into plans (user_id, content) select ${user.id}, ${JSON.stringify(templatePlan(profile))}::jsonb
      where not exists (select 1 from plans where user_id = ${user.id})`,
  ]);
  redirect('/');
}
