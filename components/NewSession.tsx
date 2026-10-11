'use client';

import { useState } from 'react';
import { startSession } from '@/app/actions';
import SessionLogger from './SessionLogger';
import { MUSCLES, formatDate, today } from '@/lib/config';
import type { Perf } from '@/lib/db';

type Props = { exercises: Record<string, string[]>; last: Record<string, Perf[]> };

// Shows the logger as soon as "Commencer" is tapped; the session row is created in the background.
export default function NewSession({ exercises, last }: Props) {
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
        <h1>Séance · {formatDate(started.date)}</h1>
        <SessionLogger sessionId={started.id} initialMuscles={started.muscles} initialSets={[]} exercises={exercises} last={last} />
      </>
    );
  }

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); start(new FormData(ev.currentTarget)); }} className="stack">
      <h1>Nouvelle séance</h1>
      <p className="muted">Quels muscles aujourd&apos;hui ?</p>
      <div className="chips">
        {MUSCLES.map((m) => (
          <label key={m} className="chip">
            <input type="checkbox" name="muscle" value={m} /> {m}
          </label>
        ))}
      </div>
      <label className="field">Date <input type="date" name="date" defaultValue={today()} /></label>
      <button className="primary">Commencer</button>
    </form>
  );
}
