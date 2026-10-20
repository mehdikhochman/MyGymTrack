import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, weekStreak } from '../lib/streak.ts';
import { nextTarget } from '../lib/config.ts';

const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date(from + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

test('no activity', () => {
  const s = computeStreak([], '2026-10-20');
  assert.equal(s.current, 0);
  assert.equal(s.best, 0);
  assert.equal(s.next, 3);
});

test('today not done yet does not break the streak', () => {
  const s = computeStreak(range('2026-10-15', 5), '2026-10-20');
  assert.equal(s.current, 5);
  assert.equal(s.doneToday, false);
  assert.equal(s.days['2026-10-20'], undefined);
});

test('missed day without freeze resets', () => {
  const s = computeStreak([...range('2026-10-10', 3), ...range('2026-10-14', 2)], '2026-10-15');
  assert.equal(s.current, 2);
  assert.equal(s.best, 3);
  assert.equal(s.days['2026-10-13'], 'missed');
});

test('7 days earn a freeze that covers a missed day', () => {
  const s = computeStreak([...range('2026-10-01', 7), ...range('2026-10-09', 3)], '2026-10-11');
  assert.equal(s.days['2026-10-08'], 'frozen');
  assert.equal(s.current, 10);
  assert.equal(s.freezes, 0);
});

test('freezes are capped at 2', () => {
  const s = computeStreak(range('2026-08-01', 40), '2026-09-09');
  assert.equal(s.current, 40);
  assert.equal(s.freezes, 2);
  assert.equal(s.next, 50);
});

test('two missed days with one freeze resets', () => {
  const s = computeStreak([...range('2026-10-01', 7), ...range('2026-10-10', 1)], '2026-10-10');
  assert.equal(s.days['2026-10-08'], 'frozen');
  assert.equal(s.days['2026-10-09'], 'missed');
  assert.equal(s.current, 1);
});

test('weekly goal streak', () => {
  // Weeks of 2026-09-28, 10-05 and 10-12 have 3 workouts; current week (10-19) has 1.
  const days = ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-15', '2026-10-19'];
  assert.deepEqual(weekStreak(days, 3, '2026-10-19'), { weeks: 3, thisWeek: 1 });
  assert.deepEqual(weekStreak([...days, '2026-10-20', '2026-10-21'], 3, '2026-10-19'), { weeks: 4, thisWeek: 3 });
  assert.equal(weekStreak(days, 4, '2026-10-19').weeks, 0);
});

test('double progression', () => {
  assert.deepEqual(nextTarget([{ weight_kg: 60, reps: 10 }], [8, 12]), { weight_kg: 60, reps: 11 });
  assert.deepEqual(nextTarget([{ weight_kg: 60, reps: 12 }, { weight_kg: 60, reps: 9 }], [8, 12]), { weight_kg: 62.5, reps: 8 });
  assert.deepEqual(nextTarget([{ weight_kg: 20, reps: 15 }], [8, 12], 2), { weight_kg: 22, reps: 8 });
  assert.deepEqual(nextTarget([{ weight_kg: 50, reps: 4 }], [6, 10]), { weight_kg: 50, reps: 6 });
  assert.deepEqual(nextTarget([{ weight_kg: 0, reps: 15 }], [8, 12]), { weight_kg: 0, reps: 16 });
});
