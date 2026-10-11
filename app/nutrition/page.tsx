import { addMeal, addWeight, deleteMeal, deleteWeight } from '../actions';
import Bar from '@/components/Bar';
import Submit from '@/components/Submit';
import { formatDate, today } from '@/lib/config';
import { dayTotals, getSettings, sql, weightTrend } from '@/lib/db';

export default async function Nutrition() {
  const [settings, totals, meals, weights, trend] = await Promise.all([
    getSettings(),
    dayTotals(),
    sql`select id, name, calories, protein_g from meals where date = ${today()} order by id`,
    sql`select id, date::text as date, weight_kg from body_weight order by date desc, id desc limit 5`,
    weightTrend(),
  ]);
  const kcal = Number(settings.kcal);
  const protein = Number(settings.protein);

  return (
    <>
      <h1>Nutrition</h1>
      <div className="card">
        <Bar label="Calories" value={totals.kcal} min={kcal} max={kcal} unit=" kcal" />
        <Bar label="Protéines" value={totals.protein} min={protein} max={protein} unit=" g" />
      </div>

      <h2>Ajouter un repas</h2>
      <form action={addMeal} className="card stack">
        <input name="name" placeholder="Nom (optionnel)" />
        <div className="row">
          <input name="calories" inputMode="numeric" placeholder="kcal" required />
          <input name="protein" inputMode="decimal" placeholder="protéines (g)" />
        </div>
        <input type="date" name="date" defaultValue={today()} />
        <Submit className="primary" pendingText="…">Ajouter</Submit>
      </form>

      {meals.length > 0 && (
        <div className="card">
          {meals.map((m) => (
            <form key={m.id} action={deleteMeal.bind(null, m.id)} className="row set">
              <span>{m.name || 'Repas'} · {m.calories} kcal · {m.protein_g} g</span>
              <Submit className="icon">×</Submit>
            </form>
          ))}
        </div>
      )}

      <h2>Poids de corps</h2>
      <form action={addWeight} className="card stack">
        <div className="row">
          <input name="weight" inputMode="decimal" placeholder="Poids (kg)" required />
          <input type="date" name="date" defaultValue={today()} />
        </div>
        <Submit className="primary" pendingText="…">Enregistrer</Submit>
      </form>

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

      {weights.length > 0 && (
        <div className="card">
          <p className="muted">Dernières pesées</p>
          {weights.map((w) => (
            <form key={w.id} action={deleteWeight.bind(null, w.id)} className="row set">
              <span>{formatDate(w.date)} · {w.weight_kg} kg</span>
              <Submit className="icon">×</Submit>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
