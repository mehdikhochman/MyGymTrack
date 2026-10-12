import Food, { type Meal } from '@/components/Food';
import Weights, { type Weight } from '@/components/Weights';
import { formatLongDate, today } from '@/lib/config';
import { expenditure, frequentMeals, getSettings, sql, weightTrend } from '@/lib/db';

export default async function Nutrition() {
  const [settings, meals, weights, trend, frequent, energy] = await Promise.all([
    getSettings(),
    sql`select id, name, calories, protein_g from meals where date = ${today()} order by id`,
    sql`select id, date::text as date, weight_kg from body_weight order by date desc, id desc limit 5`,
    weightTrend(),
    frequentMeals(),
    expenditure(),
  ]);

  return (
    <>
      <h1>Nutrition</h1>
      <p className="subtitle">{formatLongDate(today())}</p>
      <Food meals={meals as Meal[]} kcal={Number(settings.kcal)} protein={Number(settings.protein)} frequent={frequent} energy={energy} />
      <h2>Poids de corps</h2>
      <Weights weights={weights as Weight[]} trend={trend} />
    </>
  );
}
