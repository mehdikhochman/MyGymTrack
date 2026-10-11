import Link from 'next/link';
import Bar from '@/components/Bar';
import { MUSCLES, formatDate, parseRange, today } from '@/lib/config';
import { dayTotals, getSettings, sql, weeklySets } from '@/lib/db';

export default async function Home() {
  const [settings, done, food, [current]] = await Promise.all([
    getSettings(),
    weeklySets(),
    dayTotals(),
    sql`select id from sessions where date = ${today()} order by id desc limit 1`,
  ]);
  return (
    <>
      <h1>{formatDate(today())}</h1>
      <div className="stack">
        {current && <Link href={`/seance/${current.id}`} className="button primary">Reprendre la séance du jour</Link>}
        <Link href="/seance" className={current ? 'button' : 'button primary'}>Nouvelle séance</Link>
      </div>

      <h2>Objectifs de la semaine</h2>
      <div className="card">
        {MUSCLES.map((m) => {
          const [min, max] = parseRange(settings[`sets:${m}`]);
          return <Bar key={m} label={m} value={done[m] ?? 0} min={min} max={max} />;
        })}
      </div>

      <h2>Aujourd&apos;hui</h2>
      <Link href="/nutrition" className="card block">
        <Bar label="Calories" value={food.kcal} min={Number(settings.kcal)} max={Number(settings.kcal)} unit=" kcal" />
        <Bar label="Protéines" value={food.protein} min={Number(settings.protein)} max={Number(settings.protein)} unit=" g" />
      </Link>
    </>
  );
}
