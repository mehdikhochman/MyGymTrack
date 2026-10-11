'use client';

import { useRef } from 'react';
import { addWeight, deleteWeight } from '@/app/actions';
import { useInstantList } from './useInstantList';
import { formatDate, today } from '@/lib/config';

export type Weight = { id: number; date: string; weight_kg: number };

// Latest weigh-ins; adding or deleting updates the screen before the server answers.
export default function Weights({ weights }: { weights: Weight[] }) {
  const { list, add: addRow, remove } = useInstantList(weights);
  const latest = [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const form = useRef<HTMLFormElement>(null);

  async function add(fd: FormData) {
    const weight_kg = Number(String(fd.get('weight')).replace(',', '.'));
    if (!(weight_kg > 0)) return alert('Poids invalide.');
    const row = { date: String(fd.get('date') || today()), weight_kg };
    form.current?.reset();
    try {
      await addRow(row, () => addWeight(fd));
    } catch {
      alert("La pesée n'a pas pu être enregistrée.");
    }
  }

  return (
    <>
      <form ref={form} action={add} className="card stack">
        <div className="row">
          <input name="weight" inputMode="decimal" placeholder="Poids (kg)" required />
          <input type="date" name="date" defaultValue={today()} />
        </div>
        <button className="primary">Enregistrer</button>
      </form>

      {latest.length > 0 && (
        <div className="card">
          <p className="muted">Dernières pesées</p>
          {latest.map((w) => (
            <div key={w.id} className="row set">
              <span>{formatDate(w.date)} · {w.weight_kg} kg</span>
              <button className="icon" onClick={() => remove(w.id, deleteWeight, "La pesée n'a pas pu être supprimée.")} aria-label="Supprimer">×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
