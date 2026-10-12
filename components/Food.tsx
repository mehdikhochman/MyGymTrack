'use client';

import { startTransition, useOptimistic, useRef } from 'react';
import { addMeal, deleteMeal, saveSettings } from '@/app/actions';
import Icon from './Icon';
import Ring from './Ring';
import { useInstantList } from './useInstantList';
import { today } from '@/lib/config';

export type Meal = { id: number; name: string | null; calories: number; protein_g: number };
type Frequent = Omit<Meal, 'id'> & { name: string };
type Energy = { intake: number; kgPerWeek: number; tdee: number } | null;

const GAIN_KCAL = 275; // +0.25 kg/week (7700 kcal per kg)

const parse = (v: FormDataEntryValue | null) => Number(String(v ?? '').replace(',', '.'));

type Props = { meals: Meal[]; kcal: number; protein: number; frequent: Frequent[]; energy: Energy };

// Today's meals and totals; every change shows before the server answers.
export default function Food({ meals, kcal, protein, frequent, energy }: Props) {
  const { list, add: addRow, remove } = useInstantList(meals);
  const [target, setTarget] = useOptimistic(kcal);
  const form = useRef<HTMLFormElement>(null);
  const suggested = energy && Math.round((energy.tdee + GAIN_KCAL) / 50) * 50;

  async function save(row: Omit<Meal, 'id'> | null, fd: FormData) {
    try {
      await addRow(row, () => addMeal(fd));
    } catch {
      alert("Le repas n'a pas pu être enregistré.");
    }
  }

  async function add(fd: FormData) {
    const calories = Math.round(parse(fd.get('calories')));
    const protein_g = parse(fd.get('protein'));
    if (!(calories >= 0) || !(protein_g >= 0)) return alert('Valeur invalide.');
    form.current?.reset();
    await save(fd.get('date') === today() ? { name: String(fd.get('name') ?? '').trim() || null, calories, protein_g } : null, fd);
  }

  // One tap re-logs a frequent meal for today.
  function relog(m: Frequent) {
    const fd = new FormData();
    fd.set('name', m.name);
    fd.set('calories', String(m.calories));
    fd.set('protein', String(m.protein_g));
    fd.set('date', today());
    startTransition(() => save(m, fd));
  }

  function applyTarget(value: number) {
    const fd = new FormData();
    fd.set('kcal', String(value));
    startTransition(async () => {
      setTarget(value);
      await saveSettings(fd);
    });
  }

  const eaten = list.reduce((t, m) => t + m.calories, 0);
  const protein_g = list.reduce((t, m) => t + m.protein_g, 0);

  return (
    <>
      <div className="card">
        <div className="rings">
          <Ring label="Calories" value={eaten} target={target} unit="kcal" />
          <Ring label="Protéines" value={protein_g} target={protein} unit="g" />
        </div>
      </div>

      {energy && suggested && (
        <div className="card">
          <p className="muted small">Dépense estimée · 3 dernières semaines</p>
          <p className="big num">{Math.round(energy.tdee).toLocaleString('fr-FR')} <span className="muted">kcal/j</span></p>
          <p className="muted small">Poids {energy.kgPerWeek >= 0 ? '+' : ''}{energy.kgPerWeek.toFixed(2)} kg/sem · apports moyens {Math.round(energy.intake)} kcal</p>
          <div className="divider" />
          <div className="row">
            <div>
              <p className="muted small">Objectif conseillé (+0,25 kg/sem)</p>
              <p><b>{suggested.toLocaleString('fr-FR')} kcal/j</b></p>
            </div>
            {suggested !== target ? (
              <button className="primary apply" onClick={() => applyTarget(suggested)}>Appliquer</button>
            ) : (
              <span className="ok-text small">✓ Appliqué</span>
            )}
          </div>
        </div>
      )}

      {frequent.length > 0 && (
        <>
          <h2>Ajout rapide</h2>
          <div className="chips scroll">
            {frequent.map((m) => (
              <button key={`${m.name}-${m.calories}`} className="chip" onClick={() => relog(m)}>+ {m.name} · {m.calories}</button>
            ))}
          </div>
        </>
      )}

      <h2>Ajouter un repas</h2>
      <form ref={form} action={add} className="card stack">
        <input name="name" placeholder="Nom (optionnel)" />
        <div className="grid2">
          <input name="calories" inputMode="numeric" placeholder="kcal" required />
          <input name="protein" inputMode="decimal" placeholder="Protéines (g)" />
        </div>
        <input type="date" name="date" defaultValue={today()} />
        <button className="primary">Ajouter</button>
      </form>

      {list.length > 0 && (
        <>
          <h2>Repas du jour</h2>
          <div className="list">
            {list.map((m) => (
              <div key={m.id} className="item">
                <span className="grow">{m.name || 'Repas'} <span className="muted small">· {m.protein_g} g prot.</span></span>
                <b className="num">{m.calories}</b>
                <button className="icon-btn" onClick={() => remove(m.id, deleteMeal, "Le repas n'a pas pu être supprimé.")} aria-label="Supprimer"><Icon name="x" size={18} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
