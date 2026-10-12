import Link from 'next/link';
import Bar from '@/components/Bar';
import Icon from '@/components/Icon';
import Ring from '@/components/Ring';
import { MUSCLES, daysBetween, formatLongDate, parseRange, today } from '@/lib/config';
import { dayTotals, getSettings, lastTrained, sql, weeklySets } from '@/lib/db';

// Like Fitbod's recovery map: a muscle needs about 48 h before being trained hard again.
function Recovery({ muscle, last }: { muscle: string; last?: string }) {
  const days = last === undefined ? null : daysBetween(last, today());
  const tired = days !== null && days < 2;
  const when = days === null ? '' : days === 0 ? " · auj." : days === 1 ? ' · hier' : ` · ${days} j`;
  return (
    <>
      <span className={tired ? 'dot tired' : 'dot'} />
      {muscle} <span className="muted small">· {tired ? 'en récup' : 'prêt'}{when}</span>
    </>
  );
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
      <h1>{formatLongDate(today())}</h1>
      <p className="subtitle">{current ? 'Séance en cours aujourd’hui' : 'Prêt à t’entraîner ?'}</p>

      <div className="stack">
        {current && (
          <Link prefetch href={`/seance/${current.id}`} className="button primary hero-cta"><Icon name="dumbbell" /> Reprendre la séance</Link>
        )}
        <Link prefetch href="/seance" className={current ? 'button' : 'button primary hero-cta'}>
          {!current && <Icon name="dumbbell" />} {current ? 'Nouvelle séance' : 'Commencer une séance'}
        </Link>
      </div>

      <h2>Nutrition du jour</h2>
      <Link prefetch href="/nutrition" className="card link">
        <div className="rings">
          <Ring label="Calories" value={food.kcal} target={Number(settings.kcal)} unit="kcal" />
          <Ring label="Protéines" value={food.protein} target={Number(settings.protein)} unit="g" />
        </div>
      </Link>

      <h2>Séries de la semaine</h2>
      <div className="card">
        {MUSCLES.map((m) => {
          const [min, max] = parseRange(settings[`sets:${m}`]);
          return <Bar key={m} label={<Recovery muscle={m} last={trained[m]} />} value={done[m] ?? 0} min={min} max={max} />;
        })}
      </div>
    </>
  );
}
