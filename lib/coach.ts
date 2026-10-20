import { sql, activity, currentPlan, expenditure, getSettings, latestWeight, weightTrend } from './db';
import { addDays, monday, today } from './config';
import { weeklySetsOf } from './plan';
import { computeStreak, weekStreak } from './streak';
import type { User } from './auth';

// Everything the coach needs about one user, computed at read time.
export async function coachData(user: User) {
  const uid = user.id;
  const from = addDays(monday(), -21); // current week + 3 previous
  const [settings, plan, volume, lifts, food, weight, energy, act, notes, [report], bw] = await Promise.all([
    getSettings(uid),
    currentPlan(uid),
    sql`
      select date_trunc('week', se.date)::date::text as week, s.muscle, count(*)::int as sets
      from sets s join sessions se on se.id = s.session_id
      where se.user_id = ${uid} and se.date >= ${from} group by 1, 2 order by 1, 2`,
    // Best set per session (by estimated 1RM, Epley) for the 10 most trained exercises, over 8 weeks.
    sql`
      with mine as (select s.* , se.date from sets s join sessions se on se.id = s.session_id where se.user_id = ${uid}),
      top as (select exercise from mine where date >= ${from} group by exercise order by count(*) desc limit 10)
      select exercise, date::text as date,
        round(max(weight_kg * (1 + reps / 30.0))::numeric, 1)::real as e1rm,
        (array_agg(weight_kg || 'x' || reps order by weight_kg * (1 + reps / 30.0) desc))[1] as best_set,
        count(*)::int as sets
      from mine where exercise in (select exercise from top) and date >= ${addDays(from, -28)}
      group by 1, 2 order by 1, 2`,
    sql`
      select date::text as date, sum(calories)::int as kcal, sum(protein_g)::real as protein_g
      from meals where user_id = ${uid} and date >= ${addDays(today(), -13)} group by date order by date`,
    weightTrend(uid, 8),
    expenditure(uid),
    activity(uid),
    sql`select title, summary from research_notes order by created_at desc limit 8`,
    sql`select created_at::date::text as date, content from coach_reports where user_id = ${uid} order by id desc limit 1`,
    latestWeight(uid),
  ]);
  const streak = computeStreak(act.active, today());
  return {
    today: today(),
    profile: {
      goal: user.goal, experience: user.experience, sessions_per_week_target: user.days_per_week, equipment: user.equipment,
      sex: user.sex, age: user.birth_year ? new Date().getFullYear() - user.birth_year : null, height_cm: user.height_cm, weight_kg: bw ?? null,
    },
    targets: { kcal_per_day: Number(settings.kcal), protein_g_per_day: Number(settings.protein) },
    current_programme: plan && {
      name: plan.name,
      since: plan.created_at.slice(0, 10),
      weekly_sets_planned: weeklySetsOf(plan),
      days: plan.days.map((d) => ({ name: d.name, exercises: d.exercises.map((e) => `${e.name} ${e.sets}×${e.reps[0]}-${e.reps[1]}`) })),
    },
    weekly_sets_done_last_4_weeks: volume,
    main_lifts_progression: lifts,
    regularity: {
      daily_streak: streak.current,
      weeks_in_a_row_hitting_session_goal: weekStreak(act.workouts, user.days_per_week, monday()).weeks,
      workouts_last_28_days: act.workouts.filter((d) => d > addDays(today(), -28)).length,
    },
    daily_food_last_14_days: food,
    body_weight_weekly_avg_kg: weight,
    estimated_expenditure_kcal_per_day: energy && Math.round(energy.tdee),
    previous_review: report ?? null,
    research_notes: notes,
  };
}
