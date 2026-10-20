import Link from 'next/link';
import Celebration from '@/components/Celebration';
import Icon from '@/components/Icon';
import { Thumb } from '@/components/ExerciseDemo';
import { Barbell, Meter, StreakChip, WeekStrip } from '@/components/Streak';
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
          <Link href="/reglages" prefetch className="avatar" aria-label="Réglages et profil">{user.name.slice(0, 1).toUpperCase()}</Link>
        </div>
      </div>
      <p className="lede">
        {streak.doneToday
          ? 'Série gardée pour aujourd’hui. Reviens demain.'
          : streak.current > 0
            ? `Note une séance ou un repas avant minuit pour garder ta série de ${plural(streak.current, 'jour')}.`
            : 'Note une séance ou un repas pour allumer ta série.'}
      </p>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Charge ta barre</h2>
          <span className="num" style={{ fontSize: 22 }}>{week.thisWeek}/{user.days_per_week}</span>
        </div>
        <Barbell done={week.thisWeek} goal={user.days_per_week} />
        <p className="muted small center">
          {week.thisWeek >= user.days_per_week ? 'Objectif de la semaine atteint.' : `Encore ${plural(user.days_per_week - week.thisWeek, 'séance')} cette semaine.`}
          {week.weeks > 1 && ` ${week.weeks} semaines d’affilée.`}
        </p>
        <div className="divider" />
        <WeekStrip streak={streak} workouts={act.workouts} today={today()} />
      </div>

      {current && (
        <Link prefetch href={`/seance/${current.id}`} className="button primary big" style={{ marginBottom: 12 }}>
          <Icon name="dumbbell" /> Reprendre : {current.title ?? 'séance'}
        </Link>
      )}

      {day ? (
        <div className="card">
          <div className="workout-head">
            <div>
              <span className="muted small">Séance du jour · {plan!.name}</span>
              <h2 style={{ margin: '2px 0 0' }}>{day.name}</h2>
            </div>
            <Link href="/coach" prefetch className="ghost small">Programme</Link>
          </div>
          <div className="list" style={{ margin: '8px -16px 12px' }}>
            {day.exercises.map((e) => (
              <div key={e.id} className="item">
                <Thumb id={e.id} images={exerciseById(e.id)?.images} />
                <span className="grow ellipsis">{e.name}</span>
                <span className="sets-tag">{e.sets} × {e.reps[0]}-{e.reps[1]}</span>
              </div>
            ))}
          </div>
          <Link prefetch href={`/seance?jour=${next}`} className="button primary big">Commencer la séance</Link>
        </div>
      ) : (
        <Link href="/coach" prefetch className="card">
          <h2 style={{ margin: 0 }}>Pas encore de programme</h2>
          <p className="muted">Le coach peut t’en écrire un en une minute.</p>
        </Link>
      )}

      <Link href="/nutrition" prefetch className="card">
        <div className="row"><h2 style={{ margin: 0 }}>Nutrition du jour</h2><Icon name="chevron" size={18} /></div>
        <Meter label="Calories" value={food.kcal} target={Number(settings.kcal)} unit="kcal" />
        <Meter label="Protéines" value={food.protein} target={Number(settings.protein)} unit="g" kind="protein" />
      </Link>

      {celebrate && <Celebration days={reached} freezes={streak.freezes} workouts={act.workouts.length} />}
    </>
  );
}
