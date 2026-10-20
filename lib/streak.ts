// Duolingo-style streak, computed from the days the user logged something (no stored state).
// - Any logged set, meal or weigh-in keeps the flame alive for that day.
// - Every 7 days in a row earns a streak freeze (max 2 held). A missed day uses one automatically.
// - Today is never "missed": the user still has until midnight.

export const MILESTONES = [3, 7, 14, 30, 50, 100, 150, 200, 365];
export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export type DayState = 'active' | 'frozen' | 'missed';
export type Streak = {
  current: number; // days in the streak (frozen days keep it, they don't add to it)
  best: number;
  freezes: number; // held now
  doneToday: boolean;
  days: Record<string, DayState>; // from the first active day to today
  next: number | null; // next milestone
};

const shift = (date: string, n: number) => {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function computeStreak(activeDays: string[], today: string): Streak {
  const active = new Set(activeDays);
  const days: Record<string, DayState> = {};
  let current = 0, best = 0, freezes = 0;
  const first = [...active].sort()[0];
  for (let d = first; d && d <= today; d = shift(d, 1)) {
    if (active.has(d)) {
      current++;
      days[d] = 'active';
      if (current % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (d === today) {
      break;
    } else if (freezes > 0 && current > 0) {
      freezes--;
      days[d] = 'frozen';
    } else {
      current = 0;
      days[d] = 'missed';
    }
    best = Math.max(best, current);
  }
  return { current, best, freezes, doneToday: active.has(today), days, next: MILESTONES.find((m) => m > current) ?? null };
}

// Weeks in a row (Monday to Sunday) with at least `goal` workouts. The current week counts once reached,
// and does not break the run while it is still in progress.
export function weekStreak(workoutDays: string[], goal: number, thisMonday: string) {
  const perWeek = new Map<string, number>();
  for (const d of workoutDays) {
    const dow = (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const week = shift(d, -dow);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const thisWeek = perWeek.get(thisMonday) ?? 0;
  let weeks = thisWeek >= goal ? 1 : 0;
  for (let w = shift(thisMonday, -7); (perWeek.get(w) ?? 0) >= goal; w = shift(w, -7)) weeks++;
  return { weeks, thisWeek };
}
