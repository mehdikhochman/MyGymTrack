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
  ...Object.fromEntries(MUSCLES.map((m) => [`sets:${m}`, m === 'Mollets' ? '12' : '12-16'])),
};

// "12-16" -> [12, 16], "12" -> [12, 12]
export function parseRange(v: string): [number, number] {
  const [a, b] = v.split('-').map(Number);
  return [a, b || a];
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

export function monday(date = today()): string {
  const dow = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
