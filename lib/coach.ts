import { sql, expenditure, getSettings, weightTrend } from './db';
import { addDays, monday, today } from './config';

// Everything the coach needs, computed at read time.
export async function coachData() {
  const from = addDays(monday(), -21); // current week + 3 previous
  const [settings, volume, lifts, food, weight, energy, notes] = await Promise.all([
    getSettings(),
    sql`
      select date_trunc('week', se.date)::date::text as week, s.muscle, count(*)::int as sets
      from sets s join sessions se on se.id = s.session_id
      where se.date >= ${from} group by 1, 2 order by 1, 2`,
    // Best set per session (by estimated 1RM, Epley) for the 8 most trained exercises, over 8 weeks.
    sql`
      with top as (
        select exercise from sets s join sessions se on se.id = s.session_id
        where se.date >= ${from} group by exercise order by count(*) desc limit 8)
      select s.exercise, se.date::text as date,
        round(max(s.weight_kg * (1 + s.reps / 30.0))::numeric, 1)::real as e1rm,
        (array_agg(s.weight_kg || 'x' || s.reps order by s.weight_kg * (1 + s.reps / 30.0) desc))[1] as best_set
      from sets s join sessions se on se.id = s.session_id
      where s.exercise in (select exercise from top) and se.date >= ${addDays(from, -28)}
      group by 1, 2 order by 1, 2`,
    sql`
      select date::text as date, sum(calories)::int as kcal, sum(protein_g)::real as protein_g
      from meals where date >= ${addDays(today(), -13)} group by date order by date`,
    weightTrend(8),
    expenditure(),
    sql`select title, summary, source_url from research_notes order by created_at desc limit 10`,
  ]);
  return {
    today: today(),
    targets: {
      kcal_per_day: Number(settings.kcal),
      protein_g_per_day: Number(settings.protein),
      weekly_sets_per_muscle: Object.fromEntries(Object.entries(settings).filter(([k]) => k.startsWith('sets:')).map(([k, v]) => [k.slice(5), v])),
    },
    weekly_sets_per_muscle_last_4_weeks: volume,
    main_lifts_progression: lifts,
    daily_food_last_14_days: food,
    body_weight_weekly_avg_kg: weight,
    estimated_expenditure_kcal_per_day: energy && Math.round(energy.tdee),
    research_notes: notes,
  };
}
