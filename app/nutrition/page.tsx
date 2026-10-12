import Food, { type Meal } from '@/components/Food';
import Weights, { type Weight } from '@/components/Weights';
import { formatDate, today } from '@/lib/config';
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
      <Food meals={meals as Meal[]} kcal={Number(settings.kcal)} protein={Number(settings.protein)} frequent={frequent} energy={energy} />

      <h2>Poids de corps</h2>
      <Weights weights={weights as Weight[]} />

      {trend.length > 0 && (
        <div className="card">
          <p className="muted">Moyenne par semaine</p>
          {trend.map((w, i) => {
            const diff = i > 0 ? w.avg - trend[i - 1].avg : 0;
            return (
              <div key={w.week} className="row set">
                <span>Sem. du {formatDate(w.week)}</span>
                <span>{w.avg.toFixed(1)} kg {i > 0 && <span className={diff >= 0 ? 'up' : 'down'}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}</span>}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
