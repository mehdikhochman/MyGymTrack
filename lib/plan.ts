import { exerciseById, EXERCISES, type Exercise } from './exercises';

// A training programme: one entry per training day, done in rotation.
export type PlanExercise = { id: string; name: string; group: string; sets: number; reps: [number, number]; rest: number; note?: string };
export type PlanDay = { name: string; focus: string; exercises: PlanExercise[] };
export type Plan = { name: string; summary: string; days: PlanDay[]; source: 'template' | 'ai' | 'routine' };

export type Profile = { goal: string; experience: string; days_per_week: number; equipment: string; split?: string };

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
  if (e.equipment === 'Poids du corps') return { sets, reps: [8, 20], rest: 90 }; // rest > 60 s helps hypertrophy (Singer 2024)
  const table: Record<string, [[number, number], number, [number, number], number]> = {
    strength: [[3, 6], 180, [8, 12], 90],
    muscle: [[6, 10], 150, [10, 15], 90],
    fat: [[8, 12], 120, [12, 15], 90],
    fit: [[8, 12], 120, [12, 15], 90],
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
  dips: ['Dips_-_Chest_Version', 'Decline_Dumbbell_Bench_Press', 'Pushups'],
  pecdeck: ['Butterfly', null, null],
  deadlift: ['Barbell_Deadlift', null, null],
  straightarm: ['Straight-Arm_Pulldown', null, null],
  cablelateral: ['Standing_Low-Pulley_Deltoid_Raise', 'Arnold_Dumbbell_Press', null],
  shrug: ['Barbell_Shrug', 'Dumbbell_Shrug', null],
  preacher: ['Preacher_Curl', 'Concentration_Curls', null],
  tricepsoh: ['Cable_Rope_Overhead_Triceps_Extension', 'Standing_Dumbbell_Triceps_Extension', null],
  seatedcalf: ['Seated_Calf_Raise', null, null],
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
  chest: ['Pecs', 'Pectoraux', ['hpush', 'ipush', 'dips', 'chestfly', 'pecdeck']],
  back: ['Dos', 'Dos, trapèzes', ['vpull', 'row', 'hpull', 'straightarm', 'deadlift']],
  shoulders: ['Épaules', 'Épaules, trapèzes', ['vpush', 'lateral', 'cablelateral', 'reardelt', 'shrug', 'abs']],
  arms: ['Bras', 'Biceps, triceps', ['biceps', 'triceps', 'biceps2', 'triceps2', 'preacher', 'tricepsoh']],
  legsBro: ['Jambes', 'Quadriceps, ischios, fessiers, mollets', ['squat', 'legpress', 'hinge', 'legcurl', 'legext', 'calves', 'seatedcalf']],
};

const BY_DAYS: Record<number, [string, string[]]> = {
  2: ['Full body 2 jours', ['fbA', 'fbB']],
  3: ['Full body 3 jours', ['fbA', 'fbB', 'fbC']],
  4: ['Haut / bas 4 jours', ['upA', 'loA', 'upB', 'loB']],
  5: ['Haut / bas + PPL 5 jours', ['upA', 'loA', 'push', 'pull', 'legs']],
  6: ['Push / pull / jambes 6 jours', ['push', 'pull', 'legs', 'push', 'pull', 'legs']],
};
// Split chosen by the user (Réglages or coach page); 'auto' and 'keep' fall back to the number of days.
const BY_SPLIT: Record<string, [string, string[]]> = {
  full: ['Full body', ['fbA', 'fbB', 'fbC']],
  upper_lower: ['Haut / bas', ['upA', 'loA', 'upB', 'loB']],
  ppl: ['Push / pull / jambes', ['push', 'pull', 'legs']],
  bro: ['Un muscle par jour (bro split)', ['chest', 'back', 'shoulders', 'arms', 'legsBro']],
};

// Starter programme built without AI, so the app works from the first minute.
export function templatePlan(p: Profile): Plan {
  const setup = p.equipment === 'dumbbells' ? 1 : p.equipment === 'bodyweight' ? 2 : 0;
  const [name, days] = BY_SPLIT[p.split ?? ''] ?? BY_DAYS[Math.min(6, Math.max(2, p.days_per_week))];
  const plan: Plan = {
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
  return withVolume(plan, volumeTargets(p.experience));
}

// Volume rules, from the research (sources in AUDIT.md):
// - 10-20 hard sets per muscle per week (Baz-Valle 2022: 12-20 for trained lifters; beginners at the low end),
//   no extra benefit shown above 20;
// - about 10-11 useful sets per muscle in one session (Remmert, Pelland et al., per-session meta-regression);
// - frequency barely matters once weekly volume is equal (Schoenfeld 2019), so any split works.
export const WEEKLY_MAX = 20;
export const SESSION_MAX_PER_MUSCLE = 12;
const MAX_SETS_PER_EXERCISE = 5;
const MAX_SETS_PER_SESSION = 25;
const MAIN = ['Pecs', 'Dos', 'Épaules', 'Quadriceps', 'Ischios'];

// Weekly sets each group should reach: the evidence-based minimum for the level,
// raised to what the user already does (never above 20), so a new programme never trains them less.
export function volumeTargets(experience: string, current: Record<string, number> = {}) {
  const level = experience === 'beginner' ? 0 : experience === 'advanced' ? 2 : 1;
  const base: Record<string, number> = {
    ...Object.fromEntries(MAIN.map((g) => [g, [10, 12, 14][level]])),
    Biceps: [6, 8, 10][level], Triceps: [6, 8, 10][level], Mollets: [6, 8, 10][level], Fessiers: [4, 6, 8][level], Abdos: [4, 6, 6][level],
  };
  for (const [g, n] of Object.entries(current)) base[g] = Math.min(WEEKLY_MAX, Math.max(base[g] ?? 0, Math.round(n)));
  return base;
}

const setsOf = (exercises: PlanExercise[], group?: string) =>
  exercises.reduce((t, e) => t + (group === undefined || e.group === group ? e.sets : 0), 0);

// Keeps a programme within the limits (5 sets per exercise, 12 sets per muscle per session,
// 25 sets per session, 20 sets per muscle per week), then brings each group up to its weekly target.
export function withVolume(plan: Plan, targets: Record<string, number>): Plan {
  const days = plan.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e, sets: Math.min(e.sets, MAX_SETS_PER_EXERCISE) })) }));
  const trim = (list: PlanExercise[], excess: number) => {
    for (; excess > 0; excess--) {
      const e = list.filter((x) => x.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (!e) break;
      e.sets--;
    }
  };
  for (const d of days) {
    for (const g of new Set(d.exercises.map((e) => e.group))) {
      trim(d.exercises.filter((e) => e.group === g), setsOf(d.exercises, g) - SESSION_MAX_PER_MUSCLE);
    }
    trim(d.exercises, setsOf(d.exercises) - MAX_SETS_PER_SESSION);
  }
  const all = days.flatMap((d) => d.exercises);
  for (const g of new Set(all.map((e) => e.group))) trim(all.filter((e) => e.group === g), setsOf(all, g) - WEEKLY_MAX);

  for (const [group, target] of Object.entries(targets)) {
    const slots = days.flatMap((d) => d.exercises.filter((e) => e.group === group).map((e) => ({ d, e })));
    let total = slots.reduce((t, x) => t + x.e.sets, 0);
    while (total < Math.min(target, WEEKLY_MAX)) {
      const next = slots
        .filter((x) => x.e.sets < MAX_SETS_PER_EXERCISE && setsOf(x.d.exercises) < MAX_SETS_PER_SESSION
          && setsOf(x.d.exercises, group) < SESSION_MAX_PER_MUSCLE)
        .sort((a, b) => a.e.sets - b.e.sets)[0];
      if (!next) break;
      next.e.sets++;
      total++;
    }
  }
  return { ...plan, days };
}
