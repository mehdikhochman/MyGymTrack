import { exerciseById, EXERCISES, type Exercise } from './exercises';

// A training programme: one entry per training day, done in rotation.
export type PlanExercise = { id: string; name: string; group: string; sets: number; reps: [number, number]; rest: number; note?: string };
export type PlanDay = { name: string; focus: string; exercises: PlanExercise[] };
export type Plan = { name: string; summary: string; days: PlanDay[]; source: 'template' | 'ai' };

export type Profile = { goal: string; experience: string; days_per_week: number; equipment: string };

// Weekly hard sets per muscle group the programme gives (each day is done once a week).
export function weeklySetsOf(plan: Pick<Plan, 'days'>) {
  const total: Record<string, number> = {};
  for (const d of plan.days) for (const e of d.exercises) total[e.group] = (total[e.group] ?? 0) + e.sets;
  return total;
}

// Equipment each setup gives access to.
const ALLOWED: Record<string, string[] | null> = {
  gym: null, // everything
  dumbbells: ['Haltères', 'Poids du corps', 'Kettlebell', 'Élastiques', 'Swiss ball'],
  bodyweight: ['Poids du corps', 'Élastiques'],
};

// Exercises the user can do with their equipment and level (the AI coach picks from these).
export function candidates(p: Profile): Exercise[] {
  const allowed = ALLOWED[p.equipment] ?? null;
  const maxLevel = p.experience === 'beginner' ? 1 : 2;
  return EXERCISES.filter((e) => (!allowed || allowed.includes(e.equipment)) && e.level <= maxLevel && e.group !== 'Avant-bras');
}

// Sets × reps × rest for an exercise, from the goal and level (evidence-based defaults, used without AI).
export function prescription(e: Exercise, p: Profile): Pick<PlanExercise, 'sets' | 'reps' | 'rest'> {
  const big = e.compound;
  const sets = p.experience === 'beginner' ? 3 : big && p.experience === 'advanced' ? 4 : 3;
  if (e.equipment === 'Poids du corps') return { sets, reps: [8, 20], rest: 90 };
  const table: Record<string, [[number, number], number, [number, number], number]> = {
    strength: [[3, 6], 180, [8, 12], 90],
    muscle: [[6, 10], 150, [10, 15], 75],
    fat: [[8, 12], 120, [12, 15], 60],
    fit: [[8, 12], 90, [12, 15], 60],
  };
  const [cr, crest, ir, irest] = table[p.goal] ?? table.muscle;
  return { sets, reps: big ? cr : ir, rest: big ? crest : irest };
}

// Movement slots → exercise for each setup (gym, dumbbells, bodyweight); null when the setup has nothing good.
const SLOTS: Record<string, [string | null, string | null, string | null]> = {
  squat: ['Barbell_Squat', 'Goblet_Squat', 'Bodyweight_Squat'],
  legpress: ['Leg_Press', 'Split_Squat_with_Dumbbells', 'Dumbbell_Rear_Lunge'],
  hinge: ['Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  legcurl: ['Lying_Leg_Curls', null, null],
  legext: ['Leg_Extensions', null, null],
  hipthrust: ['Barbell_Hip_Thrust', 'Single_Leg_Glute_Bridge', 'Butt_Lift_Bridge'],
  calves: ['Standing_Calf_Raises', 'Standing_Dumbbell_Calf_Raise', 'Calf_Raise_On_A_Dumbbell'],
  hpush: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Pushups'],
  ipush: ['Incline_Dumbbell_Press', 'Incline_Dumbbell_Press', 'Push-Ups_With_Feet_Elevated'],
  vpush: ['Seated_Dumbbell_Press', 'Dumbbell_Shoulder_Press', null],
  lateral: ['Side_Lateral_Raise', 'Side_Lateral_Raise', null],
  chestfly: ['Cable_Crossover', 'Dumbbell_Flyes', null],
  vpull: ['Wide-Grip_Lat_Pulldown', 'Straight-Arm_Dumbbell_Pullover', 'Pullups'],
  hpull: ['Seated_Cable_Rows', 'One-Arm_Dumbbell_Row', 'Inverted_Row'],
  row: ['Bent_Over_Barbell_Row', 'Bent_Over_Two-Dumbbell_Row', 'Inverted_Row'],
  reardelt: ['Face_Pull', 'Seated_Bent-Over_Rear_Delt_Raise', null],
  biceps: ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'Chin-Up'],
  biceps2: ['Hammer_Curls', 'Hammer_Curls', null],
  triceps: ['Triceps_Pushdown', 'Standing_Dumbbell_Triceps_Extension', 'Bench_Dips'],
  triceps2: ['EZ-Bar_Skullcrusher', 'Lying_Dumbbell_Tricep_Extension', 'Push-Ups_-_Close_Triceps_Position'],
  abs: ['Cable_Crunch', 'Crunches', 'Plank'],
};

const DAY: Record<string, [string, string, string[]]> = {
  fbA: ['Full body A', 'Corps entier', ['squat', 'hpush', 'hpull', 'lateral', 'legcurl', 'triceps', 'abs']],
  fbB: ['Full body B', 'Corps entier', ['hinge', 'vpush', 'vpull', 'ipush', 'calves', 'biceps']],
  fbC: ['Full body C', 'Corps entier', ['legpress', 'ipush', 'row', 'reardelt', 'hipthrust', 'triceps2', 'abs']],
  upA: ['Haut du corps A', 'Pecs, dos, épaules, bras', ['hpush', 'row', 'vpush', 'vpull', 'lateral', 'triceps', 'biceps']],
  loA: ['Bas du corps A', 'Quadriceps, ischios, mollets', ['squat', 'hinge', 'legcurl', 'legext', 'calves', 'abs']],
  upB: ['Haut du corps B', 'Pecs, dos, épaules, bras', ['ipush', 'vpull', 'hpull', 'chestfly', 'reardelt', 'triceps2', 'biceps2']],
  loB: ['Bas du corps B', 'Fessiers, quadriceps, mollets', ['hipthrust', 'legpress', 'hinge', 'legcurl', 'calves', 'abs']],
  push: ['Push', 'Pecs, épaules, triceps', ['hpush', 'ipush', 'vpush', 'lateral', 'chestfly', 'triceps', 'triceps2']],
  pull: ['Pull', 'Dos, arrière d’épaules, biceps', ['vpull', 'row', 'hpull', 'reardelt', 'biceps', 'biceps2']],
  legs: ['Jambes', 'Quadriceps, ischios, fessiers, mollets', ['squat', 'hinge', 'legpress', 'legcurl', 'calves', 'abs']],
};

const SPLITS: Record<number, [string, string[]]> = {
  2: ['Full body 2 jours', ['fbA', 'fbB']],
  3: ['Full body 3 jours', ['fbA', 'fbB', 'fbC']],
  4: ['Haut / bas 4 jours', ['upA', 'loA', 'upB', 'loB']],
  5: ['Haut / bas + PPL 5 jours', ['upA', 'loA', 'push', 'pull', 'legs']],
  6: ['Push / pull / jambes 6 jours', ['push', 'pull', 'legs', 'push', 'pull', 'legs']],
};

// Starter programme built without AI, so the app works from the first minute.
export function templatePlan(p: Profile): Plan {
  const setup = p.equipment === 'dumbbells' ? 1 : p.equipment === 'bodyweight' ? 2 : 0;
  const [name, days] = SPLITS[Math.min(6, Math.max(2, p.days_per_week))];
  return {
    name,
    summary: 'Programme de départ construit selon ton objectif, ton niveau et ton matériel. Demande au coach IA de l’adapter quand tu as quelques séances.',
    source: 'template',
    days: days.map((key) => {
      const [dayName, focus, slots] = DAY[key];
      const ids = [...new Set(slots.map((s) => SLOTS[s][setup]).filter((id): id is string => !!id))];
      return {
        name: dayName,
        focus,
        exercises: ids.map((id) => {
          const e = exerciseById(id)!;
          return { id, name: e.name, group: e.group, ...prescription(e, p) };
        }),
      };
    }),
  };
}
