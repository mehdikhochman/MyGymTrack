import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templatePlan, volumeTargets, weeklySetsOf, withVolume, WEEKLY_MAX, SESSION_MAX_PER_MUSCLE, type Plan } from '../lib/plan.ts';
import { routineFromHistory, type HistorySession } from '../lib/routine.ts';
import { nutritionTargets } from '../lib/nutrition.ts';

const ex = (name: string, group: string, sets: number) => ({ id: name, name, group, sets, reps: [8, 12] as [number, number], rest: 120 });
const perSession = (p: Plan) => p.days.map((d) => d.exercises.reduce<Record<string, number>>((m, e) => ({ ...m, [e.group]: (m[e.group] ?? 0) + e.sets }), {}));

test('volume targets stay in the 10-20 weekly range, even for heavy current volume', () => {
  const t = volumeTargets('intermediate', { Dos: 29, Pecs: 4 });
  assert.equal(t.Dos, WEEKLY_MAX);
  assert.equal(t.Pecs, 12);
  for (const n of Object.values(volumeTargets('advanced'))) assert.ok(n <= WEEKLY_MAX);
});

test('withVolume trims a plan above the limits', () => {
  const plan: Plan = { name: 'x', summary: '', source: 'ai', days: [
    { name: 'Dos A', focus: '', exercises: [ex('Rowing', 'Dos', 6), ex('Tirage', 'Dos', 5), ex('Tractions', 'Dos', 5)] },
    { name: 'Dos B', focus: '', exercises: [ex('Rowing 2', 'Dos', 5), ex('Tirage 2', 'Dos', 5), ex('Shrug', 'Dos', 4)] },
  ] };
  const out = withVolume(plan, {});
  assert.ok(weeklySetsOf(out).Dos <= WEEKLY_MAX);
  for (const day of perSession(out)) for (const n of Object.values(day)) assert.ok(n <= SESSION_MAX_PER_MUSCLE);
  for (const e of out.days.flatMap((d) => d.exercises)) assert.ok(e.sets <= 5 && e.sets >= 2);
});

test('withVolume raises low volume without breaking the per-session limit', () => {
  const plan: Plan = { name: 'x', summary: '', source: 'ai', days: [
    { name: 'Pecs', focus: '', exercises: [ex('DC', 'Pecs', 2), ex('DI', 'Pecs', 2), ex('Ecarté', 'Pecs', 2)] },
  ] };
  const out = withVolume(plan, { Pecs: 16 });
  assert.equal(weeklySetsOf(out).Pecs, SESSION_MAX_PER_MUSCLE); // one chest day: capped at 12
});

test('templates respect every limit', () => {
  for (const split of ['bro', 'ppl', 'upper_lower', 'full', 'auto']) {
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      const p = templatePlan({ goal: 'muscle', experience, days_per_week: 5, equipment: 'gym', split });
      for (const [g, n] of Object.entries(weeklySetsOf(p))) assert.ok(n <= WEEKLY_MAX, `${split} ${g} ${n}`);
      for (const day of perSession(p)) for (const n of Object.values(day)) assert.ok(n <= SESSION_MAX_PER_MUSCLE);
      for (const d of p.days) assert.ok(d.exercises.reduce((t, e) => t + e.sets, 0) <= 25);
      for (const e of p.days.flatMap((d) => d.exercises)) assert.ok(e.rest >= 90);
    }
  }
});

// Four weeks of a 5-day bro split where the back day sometimes includes biceps work,
// and the arms day is led by biceps one week and triceps the next.
function broSplit(): HistorySession[] {
  const s = (exercise: string, muscle: string, n: number) => Array.from({ length: n }, () => ({ exercise, muscle, reps: 10, weight_kg: 50 }));
  const out: HistorySession[] = [];
  for (let w = 0; w < 4; w++) {
    const d = (i: number) => `2026-09-${String(28 + w * 7 + i).padStart(2, '0')}`.replace(/09-(3[2-9]|[4-9]\d)/, (m, x) => `10-${String(Number(x) - 30).padStart(2, '0')}`);
    out.push({ date: d(0), title: null, sets: [...s('Développé couché', 'Pecs', 4), ...s('Développé incliné haltères', 'Pecs', 4), ...s('Écarté poulie', 'Pecs', 3)] });
    out.push({ date: d(1), title: null, sets: [...s('Tractions', 'Dos', 4), ...s('Rowing barre', 'Dos', 4), ...s('Tirage horizontal', 'Dos', 4), ...(w % 2 ? s('Curl barre', 'Biceps', 4) : [])] });
    out.push({ date: d(2), title: null, sets: [...s('Développé militaire', 'Épaules', 4), ...s('Élévations latérales', 'Épaules', 4), ...s('Oiseau', 'Épaules', 3)] });
    out.push({ date: d(3), title: null, sets: [...s('Curl barre', 'Biceps', w % 2 ? 5 : 3), ...s('Extension poulie', 'Triceps', w % 2 ? 3 : 5)] });
    out.push({ date: d(4), title: null, sets: [...s('Squat', 'Quadriceps', 4), ...s('Presse à cuisses', 'Quadriceps', 4), ...s('Leg curl assis', 'Ischios', 4)] });
  }
  return out;
}

test('routine from history finds the 5 bro-split days once each', () => {
  const plan = routineFromHistory(broSplit(), 120)!;
  assert.equal(plan.days.length, 5);
  const totals = weeklySetsOf(plan);
  assert.equal(totals.Dos, 12); // one back day, not two
  assert.equal(totals.Pecs, 11);
});

test('nutrition targets follow the evidence ranges', () => {
  const p = { sex: 'm', birth_year: 1996, height_cm: 180, goal: 'muscle', days_per_week: 5, experience: 'intermediate' };
  const t = nutritionTargets(p, 75, 2026);
  assert.ok(t.protein / 75 >= 1.6 && t.protein / 75 <= 2.2);
  assert.ok(t.fat / 75 >= 0.5 && t.fat / 75 <= 1.5);
  assert.ok(t.carbs / 75 >= 3);
  const advanced = nutritionTargets({ ...p, experience: 'advanced' }, 75, 2026);
  assert.ok(advanced.kcal < t.kcal);
  assert.ok(nutritionTargets({ ...p, goal: 'fat' }, 75, 2026).protein / 75 <= 2.2);
});
