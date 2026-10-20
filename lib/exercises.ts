import data from './exercises.json';

// Exercise library: 657 strength exercises from free-exercise-db (public domain), names translated to French.
// Regenerate with `node scripts/exercises.mjs`.
export type Exercise = {
  id: string;
  name: string; // French
  en: string;
  group: string; // muscle group used for weekly volume (see MUSCLES)
  muscles: string[];
  secondary: string[];
  equipment: string;
  level: 0 | 1 | 2; // beginner, intermediate, expert
  compound: boolean;
  images: number; // 0 or 2 photos (start and end position)
};

export const EXERCISES = data as Exercise[];
const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const byName = new Map(EXERCISES.map((e) => [e.name, e]));

export const exerciseById = (id: string) => byId.get(id);
// Sets store the exercise name, so custom exercises work too.
export const exerciseByName = (name: string) => byName.get(name);

const SHA = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
export const imageUrl = (id: string, i: 0 | 1) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${SHA}/exercises/${id}/${i}.jpg`;

export const EQUIPMENT = ['Barre', 'Haltères', 'Poulie', 'Machine', 'Poids du corps', 'Barre EZ', 'Kettlebell', 'Élastiques', 'Médecine-ball', 'Swiss ball', 'Autre'];

// Accent-insensitive search on French and English names.
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function searchExercises(query: string, group?: string, list = EXERCISES) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return list.filter((e) => {
    if (group && e.group !== group) return false;
    const hay = normalize(`${e.name} ${e.en} ${e.equipment}`);
    return words.every((w) => hay.includes(w));
  });
}
