import { neon } from '@neondatabase/serverless';
import { DEFAULT_SETTINGS, EXERCISES, MUSCLES, addDays, monday, today } from './config';

// The Neon integration on Vercel sets DATABASE_URL or POSTGRES_URL depending on its prefix setting.
export const sql = neon((process.env.DATABASE_URL || process.env.POSTGRES_URL)!);

export type Set = { id: number; session_id: number; muscle: string; exercise: string; weight_kg: number; reps: number };
export type Perf = { date: string; weight_kg: number; reps: number };

export const TABLES = ['sessions', 'sets', 'meals', 'body_weight', 'settings', 'research_notes', 'coach_reports'] as const;

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await sql`select key, value from settings`;
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export async function weeklySets(from = monday()): Promise<Record<string, number>> {
  const rows = await sql`
    select s.muscle, count(*)::int as n from sets s join sessions se on se.id = s.session_id
    where se.date >= ${from} group by s.muscle`;
  return Object.fromEntries(rows.map((r) => [r.muscle, r.n]));
}

export async function dayTotals(date = today()) {
  const [r] = await sql`
    select coalesce(sum(calories), 0)::int as kcal, coalesce(sum(protein_g), 0)::real as protein
    from meals where date = ${date}`;
  return r as { kcal: number; protein: number };
}

// For every exercise: the sets of its most recent session other than this one (preloaded so opening an exercise is instant).
export async function lastPerformances(sessionId: number): Promise<Record<string, Perf[]>> {
  const rows = await sql`
    select exercise, date::text as date, weight_kg, reps from (
      select s.id, s.exercise, se.date, s.weight_kg, s.reps,
        dense_rank() over (partition by s.exercise order by se.date desc, s.session_id desc) as r
      from sets s join sessions se on se.id = s.session_id
      where s.session_id <> ${sessionId}) t
    where r = 1 order by id`;
  const last: Record<string, Perf[]> = {};
  for (const r of rows) (last[r.exercise] ??= []).push({ date: r.date, weight_kg: r.weight_kg, reps: r.reps });
  return last;
}

// Predefined exercises per muscle, plus any custom ones used before.
export async function exerciseLists() {
  const lists = Object.fromEntries(MUSCLES.map((m) => [m, [...EXERCISES[m]]]));
  for (const u of await sql`select distinct muscle, exercise from sets order by exercise`) {
    if (!lists[u.muscle]?.includes(u.exercise)) lists[u.muscle]?.push(u.exercise);
  }
  return lists;
}

export async function weightTrend(weeks = 12) {
  return (await sql`
    select date_trunc('week', date)::date::text as week, round(avg(weight_kg)::numeric, 1)::real as avg
    from body_weight where date >= ${addDays(monday(), -7 * (weeks - 1))}
    group by 1 order by 1`) as { week: string; avg: number }[];
}
