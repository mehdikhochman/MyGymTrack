import Link from 'next/link';
import Icon, { Flame } from './Icon';
import { addDays, monday } from '@/lib/config';
import type { Streak } from '@/lib/streak';

export function StreakChip({ streak }: { streak: Streak }) {
  return (
    <Link href="/progres" prefetch className={streak.doneToday ? 'flame-chip' : 'flame-chip cold'}
      aria-label={`Série de ${streak.current} jours${streak.doneToday ? '' : ', rien de noté aujourd’hui'}`}>
      <Flame size={26} lit={streak.doneToday} /> {streak.current}
    </Link>
  );
}

const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// This week, Monday to Sunday: workout days in blue, other logged days lit, frozen days in ice blue.
export function WeekStrip({ streak, workouts, today }: { streak: Streak; workouts: string[]; today: string }) {
  const start = monday(today);
  return (
    <div className="week" aria-label="Cette semaine">
      {LETTERS.map((l, i) => {
        const d = addDays(start, i);
        const state = workouts.includes(d) ? 'workout' : streak.days[d] === 'active' ? 'active' : streak.days[d] === 'frozen' ? 'frozen' : '';
        return (
          <div key={d}>
            <div className="d">{l}</div>
            <div className={`dot ${state} ${d === today ? 'today' : ''}`}>
              {state === 'workout' ? <Icon name="dumbbell" size={18} /> : state === 'active' ? <Flame size={18} /> : state === 'frozen' ? <Icon name="snow" size={16} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Weekly session goal drawn as a barbell: one plate per planned session, loaded as sessions are done.
export function Barbell({ done, goal }: { done: number; goal: number }) {
  const plates = Array.from({ length: goal }, (_, i) => <span key={i} className={i < done ? 'plate on' : 'plate'} />);
  return (
    <div className="barbell" role="img" aria-label={`${Math.min(done, goal)} séances sur ${goal} cette semaine`}>
      <span className="bar" />
      <span className="collar" />
      <span className="plates" style={{ flexDirection: 'row-reverse' }}>{plates}</span>
      <span className="bar" style={{ maxWidth: 90 }} />
      <span className="plates">{plates}</span>
      <span className="collar" />
      <span className="bar" />
    </div>
  );
}

export function Meter({ label, value, target, unit, kind = '' }: { label: string; value: number; target: number; unit: string; kind?: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const state = value > target * 1.1 ? 'over' : value >= target * 0.95 ? 'ok' : '';
  return (
    <div className={`meter ${kind} ${state}`}>
      <div className="row"><b>{label}</b><span className="muted"><span className="num" style={{ color: 'var(--ink)', fontSize: 18 }}>{Math.round(value)}</span> / {target} {unit}</span></div>
      <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
