'use client';

import { useFormStatus } from 'react-dom';
import { runCoach } from '@/app/actions';

function Button() {
  const { pending } = useFormStatus();
  return (
    <>
      <button className="primary" disabled={pending}>{pending ? 'Analyse en cours… (~20 s)' : 'Analyser ma semaine'}</button>
      {pending && <div className="skeleton" />}
    </>
  );
}

// The AI needs a few seconds: show the placeholder right away, the report replaces it.
export default function CoachRun() {
  async function run() {
    try {
      await runCoach();
    } catch {
      alert("L'analyse a échoué. Vérifie la clé ANTHROPIC_API_KEY sur Vercel.");
    }
  }
  return <form action={run} className="stack"><Button /></form>;
}
