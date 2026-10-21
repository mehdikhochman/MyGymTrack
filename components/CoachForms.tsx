'use client';

import { useActionState } from 'react';
import { makePlan, runCoach } from '@/app/actions';
import Submit from './Submit';
import { SPLIT_CHOICES } from '@/lib/config';

// New programme: written by the AI coach (from the user's routine, history and wishes),
// rebuilt from the user's own sessions, or the built-in one for the chosen split.
export function PlanForm({ ai, split, hasHistory }: { ai: boolean; split: string; hasHistory: boolean }) {
  const [message, run] = useActionState(makePlan, undefined);
  return (
    <form action={run} className="card stack">
      <h3>Changer de programme</h3>
      <label className="field">Organisation de tes séances
        <select name="split" defaultValue={split}>
          {Object.entries(SPLIT_CHOICES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      {hasHistory && (
        <>
          <button name="mode" value="routine" className="primary big">Reprendre ma routine actuelle</button>
          <p className="muted small">Tes séances, tes exercices, ton ordre et ton nombre de séries, repris de ton historique. Sans IA.</p>
          <div className="divider" />
        </>
      )}
      <textarea name="wish" maxLength={500} placeholder="Ce que tu veux (facultatif) : garder mes exercices, plus de volume pour les pecs, 1 h max, genou fragile…" aria-label="Ce que tu veux pour ton programme" />
      <p className="muted small">Le coach garde ton organisation et tes exercices préférés, ne baisse jamais ton volume, puis optimise séries, répétitions et repos.</p>
      {message && <p className="error" role="alert">{message}</p>}
      {ai && <Submit className={hasHistory ? 'soft big' : 'primary big'} pendingText="Le coach écrit ton programme… (≈ 1 min)">Demander au coach IA</Submit>}
      <button name="mode" value="template" className="soft">Programme de base pour cette organisation</button>
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
