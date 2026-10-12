export const EXERCISES: Record<string, string[]> = {
  Pecs: ['Développé couché', 'Développé incliné haltères', 'Dips', 'Écarté poulie', 'Pec deck', 'Pompes lestées'],
  Dos: ['Tractions', 'Rowing barre', 'Tirage vertical', 'Rowing haltère', 'Tirage horizontal', 'Soulevé de terre'],
  Épaules: ['Développé militaire', 'Développé haltères assis', 'Élévations latérales', 'Oiseau', 'Face pull'],
  Biceps: ['Curl barre', 'Curl haltères', 'Curl marteau', 'Curl pupitre', 'Curl poulie'],
  Triceps: ['Barre au front', 'Extension poulie', 'Extension nuque haltère', 'Développé couché prise serrée', 'Kickback'],
  Quadriceps: ['Squat', 'Presse à cuisses', 'Hack squat', 'Squat bulgare', 'Fentes', 'Leg extension'],
  Ischios: ['Soulevé de terre roumain', 'Leg curl assis', 'Leg curl allongé', 'Hip thrust', 'Good morning'],
  Mollets: ['Mollets debout', 'Mollets assis', 'Mollets à la presse', 'Mollets unilatéral haltère', 'Donkey calf raise'],
  Abdos: ['Crunch', 'Relevé de jambes', 'Crunch poulie', 'Gainage', 'Roue abdominale'],
};
export const MUSCLES = Object.keys(EXERCISES);

export const DEFAULT_SETTINGS: Record<string, string> = {
  kcal: '2950',
  protein: '130',
  rest: '120', // seconds between sets
  ...Object.fromEntries(MUSCLES.map((m) => [`sets:${m}`, m === 'Mollets' ? '12' : '12-16'])),
};

// "12-16" -> [12, 16], "12" -> [12, 12]
export function parseRange(v: string): [number, number] {
  const [a, b] = v.split('-').map(Number);
  return [a, b || a];
}

// Estimated one-rep max (Epley), used to compare sets and spot records.
export const e1rm = (s: { weight_kg: number; reps: number }) => s.weight_kg * (1 + s.reps / 30);

// Double progression in the 6-12 rep range: 12 reps on last time's best set → add 2.5 kg, else add a rep.
export function nextTarget(last: { weight_kg: number; reps: number }[]) {
  const top = last.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a));
  if (top.reps >= 12 && top.weight_kg > 0) return { weight_kg: top.weight_kg + 2.5, reps: 8 };
  return { weight_kg: top.weight_kg, reps: top.reps + 1 };
}

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

export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
