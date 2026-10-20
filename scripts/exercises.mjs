// Builds the exercise library from free-exercise-db (public domain, github.com/yuhonas/free-exercise-db).
// Usage: node scripts/exercises.mjs  →  writes lib/exercises.json (for the app) and lib/exercise-steps.json (instructions).
import { readFileSync, writeFileSync } from 'node:fs';

export const SHA = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'; // pinned dataset version (images are served from it too)
const URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${SHA}/dist/exercises.json`;

const fr = JSON.parse(readFileSync(new globalThis.URL('./exercises-fr.json', import.meta.url), 'utf8'));

const MUSCLE = {
  chest: 'Pectoraux', lats: 'Grand dorsal', 'middle back': 'Milieu du dos', 'lower back': 'Lombaires', traps: 'Trapèzes',
  shoulders: 'Épaules', neck: 'Cou', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Avant-bras', abdominals: 'Abdos',
  quadriceps: 'Quadriceps', adductors: 'Adducteurs', hamstrings: 'Ischios', glutes: 'Fessiers', abductors: 'Abducteurs', calves: 'Mollets',
};
// Muscle group used for weekly volume, from the main target muscle.
const GROUP = {
  chest: 'Pecs', lats: 'Dos', 'middle back': 'Dos', 'lower back': 'Dos', traps: 'Dos', shoulders: 'Épaules', neck: 'Épaules',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Avant-bras', abdominals: 'Abdos', quadriceps: 'Quadriceps', adductors: 'Quadriceps',
  hamstrings: 'Ischios', glutes: 'Fessiers', abductors: 'Fessiers', calves: 'Mollets',
};
const EQUIPMENT = {
  barbell: 'Barre', dumbbell: 'Haltères', cable: 'Poulie', machine: 'Machine', 'body only': 'Poids du corps', kettlebells: 'Kettlebell',
  bands: 'Élastiques', 'e-z curl bar': 'Barre EZ', 'medicine ball': 'Médecine-ball', 'exercise ball': 'Swiss ball', 'foam roll': 'Rouleau',
};
const LEVEL = { beginner: 0, intermediate: 1, expert: 2 };

const data = await (await fetch(URL)).json();
const list = [];
const steps = {};
for (const e of data) {
  if (!fr[e.id]) continue; // strength exercises only (no stretching, cardio or plyometrics)
  list.push({
    id: e.id,
    name: fr[e.id],
    en: e.name,
    group: GROUP[e.primaryMuscles[0]],
    muscles: e.primaryMuscles.map((m) => MUSCLE[m]),
    secondary: e.secondaryMuscles.map((m) => MUSCLE[m]),
    equipment: EQUIPMENT[e.equipment] ?? 'Autre',
    level: LEVEL[e.level],
    compound: e.mechanic === 'compound',
    images: e.images.length,
  });
  steps[e.id] = e.instructions;
}
list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
const missing = Object.keys(fr).filter((id) => !list.some((e) => e.id === id));
if (missing.length) throw new Error(`Missing from dataset: ${missing.join(', ')}`);

writeFileSync('lib/exercises.json', JSON.stringify(list));
writeFileSync('lib/exercise-steps.json', JSON.stringify(steps));
console.log(`${list.length} exercises`);
