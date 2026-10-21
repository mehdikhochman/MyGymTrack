import { neon } from '@neondatabase/serverless';
import { DEFAULT_SETTINGS, addDays, monday, today } from './config';
import type { Plan } from './plan';

// The Neon integration on Vercel sets DATABASE_URL or POSTGRES_URL depending on its prefix setting.
export const sql = neon((process.env.DATABASE_URL || process.env.POSTGRES_URL)!);

// Every query below is scoped to one user (uid). Sets belong to a user through their session.
export type Set = { id: number; session_id: number; muscle: string; exercise: string; weight_kg: number; reps: number };
export type Perf = { date: string; weight_kg: number; reps: number };

export async function getSettings(uid: number): Promise<Record<string, string>> {
  const rows = await sql`select key, value from settings where user_id = ${uid}`;
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export async function weeklySets(uid: number, from = monday()): Promise<Record<string, number>> {
  const rows = await sql`
    select s.muscle, count(*)::int as n from sets s join sessions se on se.id = s.session_id
    where se.user_id = ${uid} and se.date >= ${from} group by s.muscle`;
  return Object.fromEntries(rows.map((r) => [r.muscle, r.n]));
}

export async function dayTotals(uid: number, date = today()) {
  const [r] = await sql`
    select coalesce(sum(calories), 0)::int as kcal, coalesce(sum(protein_g), 0)::real as protein,
      coalesce(sum(carbs_g), 0)::real as carbs, coalesce(sum(fat_g), 0)::real as fat
    from meals where user_id = ${uid} and date = ${date}`;
  return r as { kcal: number; protein: number; carbs: number; fat: number };
}

// For every exercise: the sets of its most recent session other than this one (preloaded so opening an exercise is instant).
export async function lastPerformances(uid: number, sessionId = 0): Promise<Record<string, Perf[]>> {
  const rows = await sql`
    select exercise, date::text as date, weight_kg, reps from (
      select s.id, s.exercise, se.date, s.weight_kg, s.reps,
        dense_rank() over (partition by s.exercise order by se.date desc, s.session_id desc) as r
      from sets s join sessions se on se.id = s.session_id
      where se.user_id = ${uid} and s.session_id <> ${sessionId}) t
    where r = 1 order by id`;
  const last: Record<string, Perf[]> = {};
  for (const r of rows) (last[r.exercise] ??= []).push({ date: r.date, weight_kg: r.weight_kg, reps: r.reps });
  return last;
}

// Best estimated 1RM per exercise outside this session, to flag new records.
export async function bestLifts(uid: number, sessionId = 0): Promise<Record<string, number>> {
  const rows = await sql`
    select exercise, max(weight_kg * (1 + reps / 30.0))::real as best from sets s join sessions se on se.id = s.session_id
    where se.user_id = ${uid} and session_id <> ${sessionId} group by exercise`;
  return Object.fromEntries(rows.map((r) => [r.exercise, r.best]));
}

// Meals logged most often in the last 30 days, for one-tap re-logging.
export async function frequentMeals(uid: number) {
  return (await sql`
    select name, calories, protein_g, carbs_g, fat_g from meals
    where user_id = ${uid} and name is not null and date > ${addDays(today(), -30)}
    group by name, calories, protein_g, carbs_g, fat_g order by count(*) desc, max(id) desc limit 8`) as
    { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
}

// Energy balance over the last 3 weeks (today excluded, as it is incomplete):
// expenditure = average intake − weight change × 7700 kcal/kg. Null until there is enough data.
export async function expenditure(uid: number) {
  const from = addDays(today(), -21);
  const [r] = await sql`
    select (select avg(kcal) from (select sum(calories) as kcal from meals where user_id = ${uid} and date >= ${from} and date < ${today()} group by date) d)::real as intake,
      (select count(distinct date) from meals where user_id = ${uid} and date >= ${from} and date < ${today()})::int as days,
      (select regr_slope(weight_kg, date - ${from}::date) from body_weight where user_id = ${uid} and date >= ${from})::real as kg_per_day,
      (select count(*) from body_weight where user_id = ${uid} and date >= ${from})::int as weigh_ins`;
  if (r.days < 10 || r.weigh_ins < 4) return null;
  return { intake: r.intake as number, kgPerWeek: r.kg_per_day * 7, tdee: r.intake - r.kg_per_day * 7700 };
}

export async function weightTrend(uid: number, weeks = 12) {
  return (await sql`
    select date_trunc('week', date)::date::text as week, round(avg(weight_kg)::numeric, 1)::real as avg
    from body_weight where user_id = ${uid} and date >= ${addDays(monday(), -7 * (weeks - 1))}
    group by 1 order by 1`) as { week: string; avg: number }[];
}

export async function latestWeight(uid: number) {
  const [r] = await sql`select weight_kg from body_weight where user_id = ${uid} order by date desc, id desc limit 1`;
  return r?.weight_kg as number | undefined;
}

// Days with at least one logged set, meal or weigh-in (they keep the streak alive), and days with a workout.
export async function activity(uid: number) {
  const from = addDays(today(), -400);
  const [r] = await sql`
    with workouts as (
      select distinct se.date from sessions se where se.user_id = ${uid} and se.date >= ${from}
        and exists (select 1 from sets s where s.session_id = se.id))
    select
      coalesce((select array_agg(date::text order by date) from (
        select date from workouts
        union select date from meals where user_id = ${uid} and date >= ${from}
        union select date from body_weight where user_id = ${uid} and date >= ${from}) d), '{}') as active,
      coalesce((select array_agg(date::text order by date) from workouts), '{}') as workouts`;
  return r as { active: string[]; workouts: string[] };
}

export async function currentPlan(uid: number) {
  const [r] = await sql`select id, created_at::text as created_at, content from plans where user_id = ${uid} order by id desc limit 1`;
  return r ? { id: r.id as number, created_at: r.created_at as string, ...(r.content as Plan) } : null;
}

// Programme day to do next: the one after the last day trained since the plan was created.
export async function nextPlanDay(uid: number, plan: { created_at: string; days: unknown[] }) {
  const [r] = await sql`
    select plan_day from sessions se where user_id = ${uid} and plan_day is not null
      and exists (select 1 from sets s where s.session_id = se.id and s.created_at > ${plan.created_at}::timestamptz)
    order by date desc, id desc limit 1`;
  return r ? (r.plan_day + 1) % plan.days.length : 0;
}

// Exercises the user typed themselves (not in the library), with their muscle group.
export async function customExercises(uid: number) {
  return (await sql`
    select distinct s.exercise as name, s.muscle as group from sets s join sessions se on se.id = s.session_id
    where se.user_id = ${uid} order by 1`) as { name: string; group: string }[];
}

// Sessions of the last `days` days with their sets in order (routine detection, coach context).
export async function recentSessions(uid: number, days = 42) {
  return (await sql`
    select se.date::text as date, se.title,
      coalesce(json_agg(json_build_object('exercise', s.exercise, 'muscle', s.muscle, 'reps', s.reps, 'weight_kg', s.weight_kg) order by s.id)
        filter (where s.id is not null), '[]') as sets
    from sessions se left join sets s on s.session_id = se.id
    where se.user_id = ${uid} and se.date > ${addDays(today(), -days)}
    group by se.id order by se.date, se.id`) as import('./routine').HistorySession[];
}

// Average weekly sets per muscle group over the last 3 complete weeks.
export async function recentVolume(uid: number): Promise<Record<string, number>> {
  const rows = await sql`
    select s.muscle, (count(*) / 3.0)::real as n from sets s join sessions se on se.id = s.session_id
    where se.user_id = ${uid} and se.date >= ${addDays(monday(), -21)} and se.date < ${monday()}
    group by s.muscle`;
  return Object.fromEntries(rows.map((r) => [r.muscle, r.n]));
}
