'use client';

import { useRef } from 'react';
import { addMeal, deleteMeal } from '@/app/actions';
import Bar from './Bar';
import { useInstantList } from './useInstantList';
import { today } from '@/lib/config';

export type Meal = { id: number; name: string | null; calories: number; protein_g: number };

const parse = (v: FormDataEntryValue | null) => Number(String(v ?? '').replace(',', '.'));

// Today's meals and totals; adding or deleting updates the screen before the server answers.
export default function Food({ meals, kcal, protein }: { meals: Meal[]; kcal: number; protein: number }) {
  const { list, add: addRow, remove } = useInstantList(meals);
  const form = useRef<HTMLFormElement>(null);

  async function add(fd: FormData) {
    const calories = Math.round(parse(fd.get('calories')));
    const protein_g = parse(fd.get('protein'));
    if (!(calories >= 0) || !(protein_g >= 0)) return alert('Valeur invalide.');
    const row = { name: String(fd.get('name') ?? '').trim() || null, calories, protein_g };
    form.current?.reset();
    try {
      await addRow(fd.get('date') === today() ? row : null, () => addMeal(fd));
    } catch {
      alert("Le repas n'a pas pu être enregistré.");
    }
  }

  return (
    <>
      <div className="card">
        <Bar label="Calories" value={list.reduce((t, m) => t + m.calories, 0)} min={kcal} max={kcal} unit=" kcal" />
        <Bar label="Protéines" value={list.reduce((t, m) => t + m.protein_g, 0)} min={protein} max={protein} unit=" g" />
      </div>

      <h2>Ajouter un repas</h2>
      <form ref={form} action={add} className="card stack">
        <input name="name" placeholder="Nom (optionnel)" />
        <div className="row">
          <input name="calories" inputMode="numeric" placeholder="kcal" required />
          <input name="protein" inputMode="decimal" placeholder="protéines (g)" />
        </div>
        <input type="date" name="date" defaultValue={today()} />
        <button className="primary">Ajouter</button>
      </form>

      {list.length > 0 && (
        <div className="card">
          {list.map((m) => (
            <div key={m.id} className="row set">
              <span>{m.name || 'Repas'} · {m.calories} kcal · {m.protein_g} g</span>
              <button className="icon" onClick={() => remove(m.id, deleteMeal, "Le repas n'a pas pu être supprimé.")} aria-label="Supprimer">×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
