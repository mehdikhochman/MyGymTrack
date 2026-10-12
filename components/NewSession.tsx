'use client';

import { useState } from 'react';
import { startSession } from '@/app/actions';
import SessionLogger from './SessionLogger';
import { MUSCLES, formatDate, today } from '@/lib/config';
import type { Perf } from '@/lib/db';

type Props = { exercises: Record<string, string[]>; last: Record<string, Perf[]>; best: Record<string, number>; rest: number };

// Shows the logger as soon as "Commencer" is tapped; the session row is created in the background.
export default function NewSession({ exercises, last, best, rest }: Props) {
  const [started, setStarted] = useState<{ id: Promise<number>; muscles: string[]; date: string } | null>(null);

  function start(fd: FormData) {
    const muscles = fd.getAll('muscle').map(String);
    const date = String(fd.get('date') || today());
    const id = startSession(date);
    id.catch(() => alert("La séance n'a pas pu être créée."));
    setStarted({ id, muscles, date });
  }

  if (started) {
    return (
      <>
        <h1>Séance</h1>
        <p className="subtitle">{formatDate(started.date)}</p>
        <SessionLogger sessionId={started.id} initialMuscles={started.muscles} initialSets={[]} exercises={exercises} last={last} best={best} rest={rest} />
      </>
    );
  }

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); start(new FormData(ev.currentTarget)); }}>
      <h1>Nouvelle séance</h1>
      <p className="subtitle">Quels muscles aujourd&apos;hui ?</p>
      <div className="muscle-grid">
        {MUSCLES.map((m) => (
          <label key={m} className="chip">
            <input type="checkbox" name="muscle" value={m} /> {m}
          </label>
        ))}
      </div>
      <div className="list spaced">
        <label className="field">Date <input type="date" name="date" defaultValue={today()} /></label>
      </div>
      <button className="primary hero-cta">Commencer</button>
    </form>
  );
}
