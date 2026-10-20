import { addDays, monday } from '@/lib/config';
import type { Streak } from '@/lib/streak';

const HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Last 5 weeks, Monday first: what each day did for the streak.
export default function Calendar({ streak, workouts, today }: { streak: Streak; workouts: string[]; today: string }) {
  const start = addDays(monday(today), -28);
  const days = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  const label = { workout: 'séance', active: 'série gardée', frozen: 'gel utilisé', missed: 'manqué' } as const;
  return (
    <>
      <div className="cal" role="grid" aria-label="5 dernières semaines">
        {HEAD.map((h, i) => <div key={i} className="h">{h}</div>)}
        {days.map((d) => {
          const state = d > today ? 'empty' : workouts.includes(d) ? 'workout' : streak.days[d] ?? '';
          return (
            <div key={d} className={`c ${state} ${d === today ? 'today' : ''}`} title={state && state !== 'empty' ? label[state as keyof typeof label] : undefined}>
              {d > today ? '' : Number(d.slice(8))}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--blue)' }} />Séance</span>
        <span><i style={{ background: 'var(--flame)' }} />Série gardée</span>
        <span><i style={{ background: 'var(--ice-soft)' }} />Gel utilisé</span>
        <span><i style={{ boxShadow: 'inset 0 0 0 1.5px var(--track)' }} />Manqué</span>
      </div>
    </>
  );
}
