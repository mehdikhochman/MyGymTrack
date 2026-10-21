// Muscle groups used for weekly volume (each library exercise belongs to one).
export const MUSCLES = ['Pecs', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Avant-bras', 'Abdos', 'Quadriceps', 'Ischios', 'Fessiers', 'Mollets'];

export const DEFAULT_SETTINGS: Record<string, string> = {
  kcal: '2500',
  protein: '140',
  carbs: '300',
  fat: '70',
  rest: '120', // seconds between sets
};

export const GOALS: Record<string, { label: string; detail: string }> = {
  muscle: { label: 'Prendre du muscle', detail: 'Surplus léger, volume progressif' },
  fat: { label: 'Perdre du gras', detail: 'Déficit modéré, garder la force' },
  strength: { label: 'Gagner en force', detail: 'Charges lourdes, peu de répétitions' },
  fit: { label: 'Rester en forme', detail: 'Équilibre, régularité' },
};
// How the user splits their training week (stored in settings as "split").
export const SPLIT_CHOICES: Record<string, string> = {
  keep: 'Garder mon organisation actuelle',
  auto: 'Laisser le coach choisir',
  full: 'Full body',
  upper_lower: 'Haut / bas',
  ppl: 'Push / pull / jambes',
  bro: 'Un muscle par jour (bro split)',
};

export const LEVELS: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Confirmé' };
export const SETUPS: Record<string, { label: string; detail: string }> = {
  gym: { label: 'Salle de sport', detail: 'Barres, haltères, poulies, machines' },
  dumbbells: { label: 'Haltères à la maison', detail: 'Haltères, banc, poids du corps' },
  bodyweight: { label: 'Sans matériel', detail: 'Poids du corps uniquement' },
};

// Estimated one-rep max (Epley), used to compare sets and spot records.
export const e1rm = (s: { weight_kg: number; reps: number }) => s.weight_kg * (1 + s.reps / 30);

// Double progression: reach the top of the rep range on the best set → add weight and restart at the bottom,
// otherwise keep the weight and add a rep.
export function nextTarget(last: { weight_kg: number; reps: number }[], [lo, hi]: [number, number] = [6, 12], step = 2.5) {
  const top = last.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a));
  if (top.weight_kg === 0) return { weight_kg: 0, reps: top.reps + 1 }; // bodyweight: more reps
  if (top.reps >= hi) return { weight_kg: top.weight_kg + step, reps: lo };
  return { weight_kg: top.weight_kg, reps: Math.min(hi, Math.max(lo, top.reps + 1)) };
}

// Smallest sensible jump for the equipment.
export const weightStep = (equipment?: string) =>
  equipment === 'Haltères' || equipment === 'Kettlebell' ? 2 : equipment === 'Poulie' || equipment === 'Machine' ? 5 : 2.5;

const TZ = 'Europe/Paris';

// Local calendar date as YYYY-MM-DD.
export function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function monday(date = today()): string {
  const dow = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function formatLongDate(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n > 1 ? many : word}`;
export const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');
