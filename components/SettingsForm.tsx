'use client';

import { useOptimistic, useState } from 'react';
import { saveSettings } from '@/app/actions';
import { MUSCLES } from '@/lib/config';

// Confirms right away; the targets are saved in the background.
export default function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [saving, setSaving] = useOptimistic(false);
  const [done, setDone] = useState(false);

  async function save(fd: FormData) {
    setSaving(true);
    try {
      await saveSettings(fd);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      alert("Les objectifs n'ont pas pu être enregistrés.");
    }
  }

  return (
    <form action={save} className="card stack">
      <label className="field">Calories / jour <input name="kcal" inputMode="numeric" defaultValue={settings.kcal} /></label>
      <label className="field">Protéines / jour (g) <input name="protein" inputMode="numeric" defaultValue={settings.protein} /></label>
      <p className="muted">Séries par semaine (ex. 12-16 ou 12)</p>
      {MUSCLES.map((m) => (
        <label key={m} className="field">{m} <input name={`sets:${m}`} defaultValue={settings[`sets:${m}`]} /></label>
      ))}
      <button className="primary">{saving || done ? '✓ Enregistré' : 'Enregistrer'}</button>
    </form>
  );
}
