'use client';

import { useState, useTransition } from 'react';
import { translateExercise } from '@/app/actions';

// Instructions: French when already translated, else English with a one-tap translation by the AI.
export default function Steps({ id, en, fr: initial, ai }: { id: string; en: string[]; fr: string[] | null; ai: boolean }) {
  const [fr, setFr] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const steps = fr ?? en;
  return (
    <>
      <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      {!fr && ai && (
        <button className="soft" style={{ marginTop: 12 }} disabled={pending} onClick={() => start(async () => {
          const r = await translateExercise(id).catch(() => null);
          if (r) setFr(r); else setError(true);
        })}>{pending ? 'Traduction…' : 'Traduire en français'}</button>
      )}
      {error && <p className="error small">La traduction n’a pas abouti. Réessaie plus tard.</p>}
    </>
  );
}
