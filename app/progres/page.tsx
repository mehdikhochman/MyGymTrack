import Link from 'next/link';
import Calendar from '@/components/Calendar';
import Icon, { Flame } from '@/components/Icon';
import Weights, { type Weight } from '@/components/Weights';
import { requireUser } from '@/lib/auth';
import { addDays, fmt, formatDate, monday, plural, today } from '@/lib/config';
import { activity, sql, weightTrend } from '@/lib/db';
import { MAX_FREEZES, computeStreak, weekStreak } from '@/lib/streak';

export default async function Progress() {
  const user = await requireUser();
  const uid = user.id;
  const [act, records, weights, trend, sessions] = await Promise.all([
    activity(uid),
    // Best estimated 1RM per exercise: now vs. 8 weeks ago, for the most trained exercises.
    sql`
      with mine as (select s.exercise, s.weight_kg, s.reps, se.date, s.weight_kg * (1 + s.reps / 30.0) as e
        from sets s join sessions se on se.id = s.session_id where se.user_id = ${uid} and s.weight_kg > 0)
      select exercise, max(e)::real as best,
        (array_agg(weight_kg || ' kg × ' || reps order by e desc))[1] as best_set,
        (array_agg(date::text order by e desc))[1] as date,
        max(e) filter (where date < ${addDays(today(), -56)})::real as before
      from mine group by exercise order by count(*) desc limit 8`,
    sql`select id, date::text as date, weight_kg from body_weight where user_id = ${uid} order by date desc, id desc limit 5`,
    weightTrend(uid),
    sql`
      select se.id, se.date::text as date, coalesce(se.title, 'Séance') as title, count(s.id)::int as sets,
        coalesce(sum(s.weight_kg * s.reps), 0)::int as volume
      from sessions se left join sets s on s.session_id = se.id
      where se.user_id = ${uid} group by se.id order by se.date desc, se.id desc limit 20`,
  ]);
  const streak = computeStreak(act.active, today());
  const week = weekStreak(act.workouts, user.days_per_week, monday());
  const prevMilestone = [0, 3, 7, 14, 30, 50, 100, 150, 200, 365].filter((m) => m <= streak.current).at(-1) ?? 0;

  return (
    <>
      <h1>Progrès</h1>
      <p className="lede">La régularité fait le résultat.</p>

      <div className="card">
        <div className={streak.doneToday ? 'streak-card' : 'streak-card cold'}>
          <Flame size={64} lit={streak.current > 0} />
          <div className="grow">
            <div className="n">{streak.current}</div>
            <b>{streak.current > 1 ? 'jours d’affilée' : 'jour d’affilée'}</b>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end', gap: 6 }}>
            <span className="freeze"><Icon name="snow" size={16} /> {streak.freezes}/{MAX_FREEZES} gels</span>
            <span className="muted small">Record : {plural(streak.best, 'jour')}</span>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          Une séance, un repas ou une pesée par jour garde la flamme. Tous les 7 jours tu gagnes un gel (2 max) qui protège un jour manqué.
        </p>
        {streak.next && (
          <div className="meter">
            <div className="row small"><span>Prochain palier</span><b>{streak.next} jours</b></div>
            <div className="track"><div className="fill" style={{ width: `${((streak.current - prevMilestone) / (streak.next - prevMilestone)) * 100}%`, background: 'var(--flame)' }} /></div>
          </div>
        )}
        <div className="divider" />
        <Calendar streak={streak} workouts={act.workouts} today={today()} />
      </div>

      <div className="card row">
        <div>
          <b>Objectif hebdo : {user.days_per_week} séances</b>
          <p className="muted small">{week.weeks > 0 ? `${plural(week.weeks, 'semaine')} d’affilée réussie${week.weeks > 1 ? 's' : ''}` : 'Remplis ta barre cette semaine pour lancer la série.'}</p>
        </div>
        <span className="num" style={{ fontSize: 30 }}>{week.thisWeek}/{user.days_per_week}</span>
      </div>

      <h2>Records</h2>
      {records.length === 0 ? (
        <p className="muted">Tes meilleures séries apparaîtront ici après tes premières séances.</p>
      ) : (
        <div className="card flush list">
          {records.map((r) => {
            const gain = r.before ? ((r.best - r.before) / r.before) * 100 : null;
            return (
              <Link key={r.exercise} href={`/exercices?q=${encodeURIComponent(r.exercise)}`} className="item">
                <Icon name="trophy" />
                <span className="grow"><b className="ellipsis" style={{ display: 'block' }}>{r.exercise}</b><span className="muted small">{r.best_set} · {formatDate(r.date)}</span></span>
                <span style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontSize: 20, display: 'block' }}>{Math.round(r.best)} kg</span>
                  {gain !== null && <span className={gain >= 0 ? 'ok tiny' : 'muted tiny'}>{gain >= 0 ? '+' : ''}{gain.toFixed(0)} % en 8 sem.</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="muted tiny">Charge maximale estimée sur une répétition (formule d’Epley).</p>

      <h2>Poids de corps</h2>
      <Weights weights={weights as Weight[]} trend={trend} />

      <h2>Historique</h2>
      {sessions.length === 0 ? (
        <p className="muted">Aucune séance pour l’instant.</p>
      ) : (
        <div className="card flush list">
          {sessions.map((s) => (
            <Link key={s.id} href={`/seance/${s.id}`} prefetch={false} className="item">
              <span className="grow"><b>{s.title}</b><span className="muted small" style={{ display: 'block' }}>{formatDate(s.date)} · {plural(s.sets, 'série')} · {fmt(s.volume)} kg</span></span>
              <span className="chev"><Icon name="chevron" size={18} /></span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
