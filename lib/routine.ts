import { daysBetween } from './config';
import { exerciseByName } from './exercises';
import type { Plan, PlanDay } from './plan';

export type HistorySession = { date: string; title: string | null; sets: { exercise: string; muscle: string; reps: number; weight_kg: number }[] };

// Muscle groups that make up at least a quarter of a session's sets, most trained first.
export function mainGroups(sets: HistorySession['sets']) {
  const count: Record<string, number> = {};
  for (const s of sets) count[s.muscle] = (count[s.muscle] ?? 0) + 1;
  return Object.entries(count).filter(([, n]) => n >= sets.length / 4).sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

const GENERIC = new Set(['Séance', 'Séance libre']);

// Two sessions are the same kind of day when they share their most trained group,
// or when most of their main groups are the same (e.g. an arms day led once by biceps, once by triceps).
function sameKind(a: string[], b: string[]) {
  if (a[0] === b[0]) return true;
  const common = a.filter((g) => b.includes(g)).length;
  return common / new Set([...a, ...b]).size >= 0.5;
}

// The user's current routine, rebuilt from their logged sessions of the last 4 weeks:
// sessions are grouped by kind of day, the N most frequent kinds are kept (N = sessions per week),
// and each day copies its latest occurrence: same exercises, order and number of sets.
export function routineFromHistory(sessions: HistorySession[], rest: number): Plan | null {
  const typed = sessions
    .filter((s) => s.sets.length >= 3)
    .map((s) => ({ ...s, main: mainGroups(s.sets) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!typed.length) return null;
  const lastDate = typed[typed.length - 1].date;
  const window = typed.filter((s) => daysBetween(s.date, lastDate) < 28);

  const kinds: { main: string[]; count: number; latest: (typeof typed)[number] }[] = [];
  for (const s of window) {
    const kind = kinds.find((k) => sameKind(k.main, s.main));
    if (kind) Object.assign(kind, { count: kind.count + 1, latest: s, main: s.main });
    else kinds.push({ main: s.main, count: 1, latest: s });
  }
  const perWeek = Math.min(7, Math.max(1, Math.round(window.length / Math.max(1, Math.ceil((daysBetween(window[0].date, lastDate) + 1) / 7)))));
  const kept = [...kinds]
    .sort((a, b) => b.count - a.count || b.latest.date.localeCompare(a.latest.date))
    .slice(0, perWeek)
    .sort((a, b) => a.latest.date.localeCompare(b.latest.date))
    .map((k) => k.latest);

  const days: PlanDay[] = kept.map((s) => {
    const names = [...new Set(s.sets.map((x) => x.exercise))];
    return {
      name: s.title && !GENERIC.has(s.title) ? s.title : s.main.join(' + '),
      focus: s.main.join(', '),
      exercises: names.map((name) => {
        const done = s.sets.filter((x) => x.exercise === name);
        const lib = exerciseByName(name);
        const lo = Math.min(...done.map((x) => x.reps));
        const hi = Math.max(lo + 2, ...done.map((x) => x.reps));
        return { id: lib?.id ?? `perso:${name}`, name, group: done[0].muscle, sets: done.length, reps: [lo, hi] as [number, number], rest };
      }),
    };
  });
  return {
    name: 'Ma routine',
    summary: 'Ta routine actuelle, reprise de tes dernières séances : mêmes séances, mêmes exercices, même ordre, même nombre de séries. L’objectif de chaque série progresse automatiquement.',
    days,
    source: 'routine',
  };
}

// Sessions per week actually done over the last 4 weeks.
export const sessionsPerWeek = (sessions: HistorySession[], today: string) =>
  Math.round(sessions.filter((s) => s.sets.length >= 3 && daysBetween(s.date, today) < 28).length / 4);
