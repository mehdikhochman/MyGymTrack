'use client';

import { useActionState } from 'react';
import { makePlan, runCoach } from '@/app/actions';
import Submit from './Submit';

// Ask the AI coach for a new programme (with optional wishes), or go back to the built-in one.
export function PlanForm({ ai }: { ai: boolean }) {
  const [message, run] = useActionState(makePlan, undefined);
  return (
    <form action={run} className="card stack">
      <h3>Adapter mon programme</h3>
      <p className="muted small">Le coach relit tes séances, ta progression et ta récupération, puis réécrit les séries, répétitions et exercices.</p>
      <textarea name="wish" maxLength={500} placeholder="Tes souhaits (facultatif) : priorité aux jambes, 45 min max, genou fragile, pas de barre…" aria-label="Tes souhaits pour le programme" />
      {message && <p className="error" role="alert">{message}</p>}
      {ai && <Submit className="primary big" pendingText="Le coach écrit ton programme… (≈ 1 min)">Demander au coach IA</Submit>}
      <button name="mode" value="template" className="soft">Revenir au programme de base</button>
    </form>
  );
}

export function CoachRun() {
  const [message, run] = useActionState(async () => runCoach(), undefined);
  return (
    <form action={run}>
      <Submit className="primary big" pendingText="Analyse en cours…">Analyser ma semaine</Submit>
      {message && <p className="error" role="alert">{message}</p>}
    </form>
  );
}
