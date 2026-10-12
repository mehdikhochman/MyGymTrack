import Link from 'next/link';
import Bar from '@/components/Bar';
import { MUSCLES, daysBetween, formatDate, parseRange, today } from '@/lib/config';
import { dayTotals, getSettings, lastTrained, sql, weeklySets } from '@/lib/db';

// Like Fitbod's recovery map: a muscle needs about 48 h before being trained hard again.
function Recovery({ days }: { days: number }) {
  if (days >= 2) return <span className="note">récupéré · {days} j</span>;
  return <span className="note tired">en récupération · {days === 0 ? "aujourd'hui" : 'hier'}</span>;
}

export default async function Home() {
  const [settings, done, trained, food, [current]] = await Promise.all([
    getSettings(),
    weeklySets(),
    lastTrained(),
    dayTotals(),
    sql`select id from sessions where date = ${today()} order by id desc limit 1`,
  ]);
  return (
    <>
      <h1>{formatDate(today())}</h1>
      <div className="stack">
        {current && <Link prefetch href={`/seance/${current.id}`} className="button primary">Reprendre la séance du jour</Link>}
        <Link prefetch href="/seance" className={current ? 'button' : 'button primary'}>Nouvelle séance</Link>
      </div>

      <h2>Objectifs de la semaine</h2>
      <div className="card">
        {MUSCLES.map((m) => {
          const [min, max] = parseRange(settings[`sets:${m}`]);
          return <Bar key={m} label={m} value={done[m] ?? 0} min={min} max={max} note={trained[m] && <Recovery days={daysBetween(trained[m], today())} />} />;
        })}
      </div>

      <h2>Aujourd&apos;hui</h2>
      <Link prefetch href="/nutrition" className="card block">
        <Bar label="Calories" value={food.kcal} min={Number(settings.kcal)} max={Number(settings.kcal)} unit=" kcal" />
        <Bar label="Protéines" value={food.protein} min={Number(settings.protein)} max={Number(settings.protein)} unit=" g" />
      </Link>
    </>
  );
}
