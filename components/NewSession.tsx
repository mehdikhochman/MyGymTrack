'use client';

import { useEffect, useRef, useState } from 'react';
import { startSession } from '@/app/actions';
import SessionLogger, { type Card } from './SessionLogger';
import Icon from './Icon';
import { Thumb } from './ExerciseDemo';
import { today } from '@/lib/config';
import { exerciseById } from '@/lib/exercises';
import type { Perf } from '@/lib/db';
import type { PlanDay } from '@/lib/plan';

type Props = {
  days: PlanDay[];
  next: number; // programme day to do next
  auto: number | null; // start this day right away (from the home screen)
  last: Record<string, Perf[]>;
  best: Record<string, number>;
  rest: number;
  custom: { name: string; group: string }[];
};

const cardsOf = (d: PlanDay): Card[] => d.exercises.map((e) => ({ name: e.name, group: e.group, sets: e.sets, reps: e.reps, rest: e.rest, note: e.note }));

// Shows the logger as soon as a day is tapped; the session row is created in the background.
type Started = { id: Promise<number>; title: string; cards: Card[]; at: number };

// Starts a session on screen at once; `send` creates its row in the background and resolves the id.
function begin(days: PlanDay[], day: number | null): [Started, () => void] {
  let resolve!: (id: number) => void, reject!: (e: unknown) => void;
  const id = new Promise<number>((ok, ko) => { resolve = ok; reject = ko; });
  id.then((sid) => window.history.replaceState(null, '', `/seance/${sid}`), () => alert("La séance n'a pas pu être créée."));
  const title = day === null ? 'Séance libre' : days[day].name;
  const send = () => startSession(today(), day, title).then(resolve, reject);
  return [{ id, title, cards: day === null ? [] : cardsOf(days[day]), at: Date.now() }, send];
}

// Shows the logger as soon as a day is tapped (or right away when opened from the home screen).
export default function NewSession({ days, next, auto, last, best, rest, custom }: Props) {
  const [pending] = useState(() => (auto !== null && days[auto] ? begin(days, auto) : null));
  const [started, setStarted] = useState<Started | null>(pending?.[0] ?? null);
  const sent = useRef(false);
  useEffect(() => {
    if (pending && !sent.current) {
      sent.current = true;
      pending[1]();
    }
  }, [pending]);

  function start(day: number | null) {
    const [s, send] = begin(days, day);
    send();
    setStarted(s);
  }

  if (started) {
    return <SessionLogger sessionId={started.id} title={started.title} date={today()} startedAt={started.at} planned={started.cards}
      initialSets={[]} last={last} best={best} rest={rest} custom={custom} />;
  }

  return (
    <>
      <h1>Séance</h1>
      <p className="lede">{days.length ? 'Le coach a préparé la suivante. Tu peux aussi en choisir une autre.' : 'Pas encore de programme : lance une séance libre.'}</p>
      {days.map((d, i) => (
        <div key={i} className="card">
          <div className="workout-head">
            <h2 style={{ margin: 0 }}>{d.name}</h2>
            {i === next && <span className="badge">À faire</span>}
          </div>
          <p className="muted small">{d.focus} · {d.exercises.length} exercices · {d.exercises.reduce((t, e) => t + e.sets, 0)} séries</p>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 6, margin: '10px 0' }}>
            {d.exercises.slice(0, 6).map((e) => <Thumb key={e.id} id={e.id} images={exerciseById(e.id)?.images} />)}
          </div>
          <button className={i === next ? 'primary big' : 'big soft'} onClick={() => start(i)}>Commencer</button>
        </div>
      ))}
      <button className="big" onClick={() => start(null)}><Icon name="plus" /> Séance libre</button>
    </>
  );
}
