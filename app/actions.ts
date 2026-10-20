'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { COOKIE, currentUser, endSession, hashPassword, limited, passwordError, sha256, userId, verifyOrWaste } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sql, latestWeight, type Set } from '@/lib/db';
import { GOALS, LEVELS, MUSCLES, SETUPS, today } from '@/lib/config';
import { aiEnabled, aiErrorMessage, coachReport, generatePlan, translateSteps } from '@/lib/ai';
import { coachData } from '@/lib/coach';
import { exerciseById } from '@/lib/exercises';
import { nutritionTargets } from '@/lib/nutrition';
import { candidates, templatePlan } from '@/lib/plan';
import steps from '@/lib/exercise-steps.json';

// Every action checks the session (userId) and only touches the user's own rows.

const num = (v: FormDataEntryValue | null, max = 100_000) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('Valeur invalide');
  return n;
};
const date = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : today());
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max) || null;
// Purges the client cache so every page shows fresh data; the tabs then re-prefetch themselves (see Nav).
const refresh = () => revalidatePath('/', 'layout');

// Sessions & sets

export async function startSession(day: string, planDay: number | null, title: string | null) {
  const uid = await userId();
  const [{ id }] = await sql`
    insert into sessions (user_id, date, plan_day, title)
    values (${uid}, ${date(day)}, ${Number.isInteger(planDay) ? planDay : null}, ${text(title, 60)}) returning id`;
  refresh();
  return id as number;
}

export async function deleteSession(id: number) {
  const uid = await userId();
  await sql`delete from sessions where id = ${id} and user_id = ${uid}`;
  refresh();
}

export async function addSet(s: Omit<Set, 'id'>) {
  const uid = await userId();
  const exercise = s.exercise.trim().slice(0, 80);
  if (!exercise || !MUSCLES.includes(s.muscle) || !(s.weight_kg >= 0 && s.weight_kg <= 1000) || !(s.reps > 0 && s.reps <= 1000)) {
    throw new Error('Série invalide');
  }
  const [row] = await sql`
    insert into sets (session_id, muscle, exercise, weight_kg, reps)
    select id, ${s.muscle}, ${exercise}, ${s.weight_kg}, ${Math.round(s.reps)} from sessions where id = ${s.session_id} and user_id = ${uid}
    returning id, session_id, muscle, exercise, weight_kg, reps`;
  if (!row) throw new Error('Séance introuvable');
  refresh();
  return row as Set;
}

export async function deleteSet(id: number) {
  const uid = await userId();
  await sql`delete from sets s using sessions se where s.id = ${id} and se.id = s.session_id and se.user_id = ${uid}`;
  refresh();
}

// Food & body weight

export async function addMeal(fd: FormData) {
  const uid = await userId();
  const [{ id }] = await sql`
    insert into meals (user_id, date, name, calories, protein_g, carbs_g, fat_g)
    values (${uid}, ${date(fd.get('date'))}, ${text(fd.get('name'), 80)}, ${Math.round(num(fd.get('calories'), 20_000))},
      ${num(fd.get('protein') || '0', 2000)}, ${num(fd.get('carbs') || '0', 3000)}, ${num(fd.get('fat') || '0', 2000)})
    returning id`;
  refresh();
  return id as number;
}

export async function deleteMeal(id: number) {
  const uid = await userId();
  await sql`delete from meals where id = ${id} and user_id = ${uid}`;
  refresh();
}

export async function addWeight(fd: FormData) {
  const uid = await userId();
  const weight = num(fd.get('weight'), 400);
  if (weight < 20) throw new Error('Valeur invalide');
  const [{ id }] = await sql`insert into body_weight (user_id, date, weight_kg) values (${uid}, ${date(fd.get('date'))}, ${weight}) returning id`;
  refresh();
  return id as number;
}

export async function deleteWeight(id: number) {
  const uid = await userId();
  await sql`delete from body_weight where id = ${id} and user_id = ${uid}`;
  refresh();
}

// Settings & profile

const SETTING_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'rest'];

async function saveSettingValues(uid: number, values: Record<string, string>) {
  const rows = Object.entries(values).filter(([k, v]) => SETTING_KEYS.includes(k) && /^\d{1,5}$/.test(v));
  if (rows.length) await sql.transaction(rows.map(([key, value]) => sql`
    insert into settings (user_id, key, value) values (${uid}, ${key}, ${value})
    on conflict (user_id, key) do update set value = excluded.value`));
}

export async function saveSettings(fd: FormData) {
  const uid = await userId();
  await saveSettingValues(uid, Object.fromEntries(SETTING_KEYS.map((k) => [k, String(fd.get(k) ?? '').trim()])));
  refresh();
}

export async function saveProfile(fd: FormData) {
  const user = await currentUser();
  if (!user) throw new Error('Non autorisé');
  const pick = (k: string, allowed: Record<string, unknown>, current: string) => (String(fd.get(k)) in allowed ? String(fd.get(k)) : current);
  const n = (k: string, lo: number, hi: number) => {
    const v = Number(String(fd.get(k) ?? '').replace(',', '.'));
    return String(fd.get(k) ?? '').trim() && v >= lo && v <= hi ? v : null;
  };
  const profile = {
    name: text(fd.get('name'), 40) ?? user.name,
    goal: pick('goal', GOALS, user.goal),
    experience: pick('experience', LEVELS, user.experience),
    equipment: pick('equipment', SETUPS, user.equipment),
    days_per_week: n('days', 2, 6) ?? user.days_per_week,
    sex: fd.get('sex') === 'f' ? 'f' : fd.get('sex') === 'm' ? 'm' : null,
    birth_year: n('birth_year', 1920, new Date().getFullYear() - 13),
    height_cm: n('height', 120, 230),
  };
  await sql`
    update users set name = ${profile.name}, goal = ${profile.goal}, experience = ${profile.experience}, equipment = ${profile.equipment},
      days_per_week = ${profile.days_per_week}, sex = ${profile.sex}, birth_year = ${profile.birth_year}, height_cm = ${profile.height_cm}
    where id = ${user.id}`;
  if (fd.get('targets') === 'on') {
    const weight = (await latestWeight(user.id)) ?? (profile.sex === 'f' ? 62 : 75);
    const t = nutritionTargets(profile, weight);
    await saveSettingValues(user.id, Object.fromEntries(Object.entries(t).map(([k, v]) => [k, String(v)])));
  }
  refresh();
}

// Streak milestone already celebrated (so the celebration shows once).
export async function celebrated(milestone: number) {
  const uid = await userId();
  await sql`
    insert into settings (user_id, key, value) values (${uid}, 'milestone', ${String(Math.round(milestone))})
    on conflict (user_id, key) do update set value = excluded.value`;
}

// AI coach

export async function runCoach() {
  const user = await currentUser();
  if (!user) throw new Error('Non autorisé');
  if (!aiEnabled()) return 'Le coach IA n’est pas activé sur ce site (clé ANTHROPIC_API_KEY manquante).';
  if (await limited(`coach:${user.id}`, 5, 86_400)) return 'Limite atteinte : 5 analyses par jour.';
  try {
    const content = await coachReport(await coachData(user));
    await sql`insert into coach_reports (user_id, content) values (${user.id}, ${content})`;
  } catch (e) {
    return aiErrorMessage(e, 'Le coach n’a pas pu répondre. Réessaie dans un instant.');
  }
  refresh();
}

// New programme: written by the AI coach from the user's data and wishes, or the built-in template without AI.
export async function makePlan(_: string | undefined, fd: FormData) {
  const user = await currentUser();
  if (!user) throw new Error('Non autorisé');
  let plan = templatePlan(user);
  if (fd.get('mode') !== 'template') {
    if (!aiEnabled()) return 'Le coach IA n’est pas activé sur ce site (clé ANTHROPIC_API_KEY manquante).';
    if (await limited(`plan:${user.id}`, 3, 86_400)) return 'Limite atteinte : 3 programmes par jour.';
    try {
      const context = { ...(await coachData(user)), user_request: text(fd.get('wish'), 500) };
      plan = await generatePlan(context, candidates(user), user.days_per_week);
    } catch (e) {
      return aiErrorMessage(e, 'Le coach n’a pas pu écrire le programme. Réessaie dans un instant.');
    }
  }
  await sql`insert into plans (user_id, content) values (${user.id}, ${JSON.stringify(plan)}::jsonb)`;
  refresh();
  redirect('/coach');
}

// French instructions for an exercise, translated once and shared by everyone.
export async function translateExercise(id: string) {
  const uid = await userId();
  const e = exerciseById(id);
  const en = (steps as Record<string, string[]>)[id];
  if (!e || !en?.length || !aiEnabled()) return null;
  const [cached] = await sql`select steps from exercise_fr where id = ${id}`;
  if (cached) return cached.steps as string[];
  if (await limited(`translate:${uid}`, 30, 86_400)) return null;
  const fr = await translateSteps(e.name, en);
  await sql`insert into exercise_fr (id, steps) values (${id}, ${JSON.stringify(fr)}::jsonb) on conflict (id) do nothing`;
  return fr;
}

// Web push reminders

export async function savePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const uid = await userId();
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) throw new Error('Abonnement invalide');
  await sql`
    insert into push_subscriptions (endpoint, user_id, p256dh, auth) values (${sub.endpoint}, ${uid}, ${sub.keys.p256dh.slice(0, 200)}, ${sub.keys.auth.slice(0, 100)})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`;
}

export async function deletePush(endpoint: string) {
  const uid = await userId();
  await sql`delete from push_subscriptions where endpoint = ${endpoint} and user_id = ${uid}`;
}

// Account

export async function logout() {
  await endSession();
  redirect('/login');
}

// New password; every other device is signed out.
export async function changePassword(_: string | undefined, fd: FormData) {
  const uid = await userId();
  const next = String(fd.get('next') ?? '');
  const bad = passwordError(next);
  if (bad) return bad;
  if (await limited(`password:${uid}`, 5, 900)) return 'Trop de tentatives. Réessaie dans 15 minutes.';
  const [u] = await sql`select password_hash from users where id = ${uid}`;
  if (!(await verifyOrWaste(String(fd.get('current') ?? ''), u?.password_hash))) return 'Mot de passe actuel incorrect.';
  const token = (await cookies()).get(COOKIE)?.value ?? '';
  await sql.transaction([
    sql`update users set password_hash = ${await hashPassword(next)} where id = ${uid}`,
    sql`delete from auth_sessions where user_id = ${uid} and id <> ${sha256(token)}`,
  ]);
  return 'Mot de passe modifié.';
}

export async function deleteAccount(_: string | undefined, fd: FormData) {
  const uid = await userId();
  const [u] = await sql`select password_hash from users where id = ${uid}`;
  if (!(await verifyOrWaste(String(fd.get('password') ?? ''), u?.password_hash))) return 'Mot de passe incorrect.';
  await sql`delete from users where id = ${uid}`; // cascades to all the user's data
  await endSession();
  redirect('/inscription');
}
