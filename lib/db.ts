import { neon } from '@neondatabase/serverless';
import { DEFAULT_SETTINGS, addDays, monday, today } from './config';

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

// Sets of the most recent other session that included this exercise.
export async function lastPerformance(exercise: string, sessionId: number) {
  return (await sql`
    select se.date::text as date, s.weight_kg, s.reps from sets s join sessions se on se.id = s.session_id
    where s.exercise = ${exercise} and s.session_id = (
      select s2.session_id from sets s2 join sessions se2 on se2.id = s2.session_id
      where s2.exercise = ${exercise} and s2.session_id <> ${sessionId}
      order by se2.date desc, s2.session_id desc limit 1)
    order by s.id`) as Perf[];
}

export async function weightTrend(weeks = 12) {
  return (await sql`
    select date_trunc('week', date)::date::text as week, round(avg(weight_kg)::numeric, 1)::real as avg
    from body_weight where date >= ${addDays(monday(), -7 * (weeks - 1))}
    group by 1 order by 1`) as { week: string; avg: number }[];
}
