import Link from 'next/link';
import Celebration from '@/components/Celebration';
import Icon from '@/components/Icon';
import { Thumb } from '@/components/ExerciseDemo';
import { Meter, StreakChip, WeekStrip } from '@/components/Streak';
import { requireUser } from '@/lib/auth';
import { formatLongDate, monday, plural, today } from '@/lib/config';
import { activity, currentPlan, dayTotals, getSettings, nextPlanDay, sql } from '@/lib/db';
import { exerciseById } from '@/lib/exercises';
import { MILESTONES, computeStreak, weekStreak } from '@/lib/streak';

export default async function Today() {
  const user = await requireUser();
  const uid = user.id;
  const [settings, plan, food, act, [current]] = await Promise.all([
    getSettings(uid),
    currentPlan(uid),
    dayTotals(uid),
    activity(uid),
    sql`select id, title from sessions where user_id = ${uid} and date = ${today()} order by id desc limit 1`,
  ]);
  const next = plan ? await nextPlanDay(uid, plan) : 0;
  const day = plan?.days[next];
  const streak = computeStreak(act.active, today());
  const week = weekStreak(act.workouts, user.days_per_week, monday());

  // Milestone reached and not celebrated yet (a lower stored value than the streak means a new run).
  const reached = [...MILESTONES].reverse().find((m) => m <= streak.current);
  const seen = Number(settings.milestone ?? 0);
  const celebrate = reached && reached > (seen <= streak.current ? seen : 0);

  return (
    <>
      <div className="top">
        <div>
          <div className="date">{formatLongDate(today())}</div>
          <h1>Salut {user.name}</h1>
        </div>
        <div className="top-actions">
          <StreakChip streak={streak} />
          <Link href="/reglages" prefetch className="icon-btn soft" aria-label="Réglages et profil"><Icon name="settings" /></Link>
        </div>
      </div>
      <p className="lede">
        {streak.doneToday
          ? `Bravo, ta série de ${plural(streak.current, 'jour')} continue. À demain !`
          : streak.current > 0
            ? `Note une séance ou un repas aujourd’hui pour garder ta série de ${plural(streak.current, 'jour')} 🔥`
            : 'Note une séance ou un repas pour lancer ta série 🔥'}
      </p>

      {current && (
        <Link prefetch href={`/seance/${current.id}`} className="button primary big" style={{ marginBottom: 12 }}>
          <Icon name="dumbbell" /> Reprendre : {current.title ?? 'séance'}
        </Link>
      )}

      {day ? (
        <div className="card">
          <span className="muted small">Ta séance du jour</span>
          <h2 style={{ margin: '2px 0 4px' }}>{day.name}</h2>
          <p className="muted small">{plural(day.exercises.length, 'exercice')} · {day.exercises.reduce((t, e) => t + e.sets, 0)} séries</p>
          <div className="list" style={{ margin: '8px -16px 12px' }}>
            {day.exercises.map((e) => (
              <div key={e.id} className="item">
                <Thumb id={e.id} images={exerciseById(e.id)?.images} />
                <span className="grow ellipsis">{e.name}</span>
                <span className="sets-tag">{e.sets} × {e.reps[0]}-{e.reps[1]}</span>
              </div>
            ))}
          </div>
          <Link prefetch href={`/seance?jour=${next}`} className="button primary big">Commencer</Link>
        </div>
      ) : (
        <Link href="/coach" prefetch className="card">
          <h2 style={{ margin: 0 }}>Pas encore de programme</h2>
          <p className="muted">Touche ici : le coach t’en prépare un.</p>
        </Link>
      )}

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Cette semaine</h2>
          <span><span className="num" style={{ fontSize: 26 }}>{week.thisWeek}</span><span className="muted"> / {plural(user.days_per_week, 'séance')}</span></span>
        </div>
        <p className="muted small" style={{ marginBottom: 10 }}>
          {week.thisWeek >= user.days_per_week ? 'Objectif atteint 💪' : `Encore ${plural(user.days_per_week - week.thisWeek, 'séance')} pour atteindre ton objectif.`}
        </p>
        <WeekStrip streak={streak} workouts={act.workouts} today={today()} />
        <div className="legend">
          <span><i style={{ background: 'var(--blue)' }} />Séance</span>
          <span><i style={{ background: 'var(--flame-soft)' }} />Repas ou pesée</span>
        </div>
      </div>

      <Link href="/nutrition" prefetch className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Manger aujourd’hui</h2><Icon name="chevron" size={18} /></div>
        <Meter label="Calories" value={food.kcal} target={Number(settings.kcal)} unit="kcal" />
        <Meter label="Protéines" value={food.protein} target={Number(settings.protein)} unit="g" kind="protein" />
      </Link>

      {celebrate && <Celebration days={reached} freezes={streak.freezes} workouts={act.workouts.length} />}
    </>
  );
}
