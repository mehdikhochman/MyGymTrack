'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { COOKIE, MAX_AGE, guard, makeToken, passwordOk } from '@/lib/auth';
import { sql, lastPerformance, type Set } from '@/lib/db';
import { DEFAULT_SETTINGS, MUSCLES, today } from '@/lib/config';
import { coachReport } from '@/lib/ai';
import { coachData } from '@/lib/coach';

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new Error('Valeur invalide');
  return n;
};
const date = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : today());
const refresh = () => revalidatePath('/', 'layout');

export async function login(_: string | undefined, fd: FormData) {
  if (!passwordOk(String(fd.get('password') ?? ''))) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return 'Mot de passe incorrect';
  }
  (await cookies()).set(COOKIE, makeToken(), { httpOnly: true, secure: true, sameSite: 'lax', maxAge: MAX_AGE, path: '/' });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}

// Sessions & sets

export async function startSession(fd: FormData) {
  await guard();
  const muscles = fd.getAll('muscle').map(String).filter((m) => MUSCLES.includes(m));
  const [{ id }] = await sql`insert into sessions (date) values (${date(fd.get('date'))}) returning id`;
  redirect(`/seance/${id}?m=${encodeURIComponent(muscles.join(','))}`);
}

export async function deleteSession(id: number) {
  await guard();
  await sql`delete from sessions where id = ${id}`;
  refresh();
  redirect('/historique');
}

export async function addSet(s: Omit<Set, 'id'>) {
  await guard();
  if (!s.exercise.trim() || !MUSCLES.includes(s.muscle) || !(s.weight_kg >= 0) || !(s.reps > 0)) throw new Error('Série invalide');
  const [row] = await sql`
    insert into sets (session_id, muscle, exercise, weight_kg, reps)
    values (${s.session_id}, ${s.muscle}, ${s.exercise.trim()}, ${s.weight_kg}, ${Math.round(s.reps)}) returning *`;
  return row as Set;
}

export async function deleteSet(id: number) {
  await guard();
  await sql`delete from sets where id = ${id}`;
}

export async function getLast(exercise: string, sessionId: number) {
  await guard();
  return lastPerformance(exercise, sessionId);
}

// Food & body weight

export async function addMeal(fd: FormData) {
  await guard();
  const name = String(fd.get('name') ?? '').trim() || null;
  await sql`insert into meals (date, name, calories, protein_g)
    values (${date(fd.get('date'))}, ${name}, ${Math.round(num(fd.get('calories')))}, ${num(fd.get('protein') || '0')})`;
  refresh();
}

export async function deleteMeal(id: number) {
  await guard();
  await sql`delete from meals where id = ${id}`;
  refresh();
}

export async function addWeight(fd: FormData) {
  await guard();
  await sql`insert into body_weight (date, weight_kg) values (${date(fd.get('date'))}, ${num(fd.get('weight'))})`;
  refresh();
}

export async function deleteWeight(id: number) {
  await guard();
  await sql`delete from body_weight where id = ${id}`;
  refresh();
}

// Settings

export async function saveSettings(fd: FormData) {
  await guard();
  const rows = Object.keys(DEFAULT_SETTINGS)
    .map((key) => ({ key, value: String(fd.get(key) ?? '').trim() }))
    .filter((r) => /^\d+(-\d+)?$/.test(r.value));
  await sql.transaction(rows.map((r) => sql`
    insert into settings (key, value) values (${r.key}, ${r.value})
    on conflict (key) do update set value = excluded.value`));
  refresh();
}

// AI coach & research notes

export async function runCoach() {
  await guard();
  const content = await coachReport(await coachData());
  await sql`insert into coach_reports (content) values (${content})`;
  refresh();
}

export async function deleteNote(id: number) {
  await guard();
  await sql`delete from research_notes where id = ${id}`;
  refresh();
}
