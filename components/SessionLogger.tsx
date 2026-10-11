'use client';

import { useState } from 'react';
import { addSet, deleteSet, getLast } from '@/app/actions';
import { MUSCLES, formatDate } from '@/lib/config';
import type { Perf, Set } from '@/lib/db';

type Props = { sessionId: number; initialMuscles: string[]; initialSets: Set[]; exercises: Record<string, string[]> };
type Open = { muscle: string; exercise: string };

export default function SessionLogger({ sessionId, initialMuscles, initialSets, exercises }: Props) {
  const [muscles, setMuscles] = useState(initialMuscles);
  const [sets, setSets] = useState(initialSets);
  const [lists, setLists] = useState(exercises);
  const [open, setOpen] = useState<Open | null>(null);
  const [last, setLast] = useState<Record<string, Perf[]>>({});
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [busy, setBusy] = useState(false);

  const setsOf = (exercise: string) => sets.filter((s) => s.exercise === exercise);

  async function openExercise(muscle: string, exercise: string) {
    if (open?.exercise === exercise) return setOpen(null);
    setOpen({ muscle, exercise });
    // Prefill with the latest set of this session, else the first set from last time.
    const prefill = (p?: { weight_kg: number; reps: number }) => {
      setWeight(p ? String(p.weight_kg) : '');
      setReps(p ? String(p.reps) : '');
    };
    const mine = setsOf(exercise);
    prefill(mine.at(-1) ?? last[exercise]?.[0]);
    if (!last[exercise]) {
      const perf = await getLast(exercise, sessionId);
      setLast((l) => ({ ...l, [exercise]: perf }));
      if (!mine.length) prefill(perf[0]);
    }
  }

  async function add() {
    if (!open || busy) return;
    setBusy(true);
    try {
      const row = await addSet({ session_id: sessionId, ...open, weight_kg: Number(weight.replace(',', '.')), reps: Number(reps) });
      setSets((s) => [...s, row]);
    } catch {
      alert('Série invalide : vérifie le poids et les répétitions.');
    }
    setBusy(false);
  }

  async function remove(id: number) {
    setSets((s) => s.filter((x) => x.id !== id));
    await deleteSet(id);
  }

  function addCustom(muscle: string, name: string) {
    const exercise = name.trim();
    if (!exercise) return;
    if (!lists[muscle].includes(exercise)) setLists((l) => ({ ...l, [muscle]: [...l[muscle], exercise] }));
    openExercise(muscle, exercise);
  }

  const step = (v: string, d: number) => String(Math.max(0, Math.round((Number(v.replace(',', '.')) + d) * 100) / 100));
  const done = [...new Set(sets.map((s) => s.exercise))];

  return (
    <>
      {done.length > 0 && (
        <div className="card">
          {done.map((e) => (
            <p key={e} className="summary"><b>{e}</b> {setsOf(e).map((s) => `${s.weight_kg}×${s.reps}`).join(' · ')}</p>
          ))}
        </div>
      )}

      {muscles.map((m) => (
        <section key={m}>
          <h2>{m} <span className="muted">{sets.filter((s) => s.muscle === m).length} séries</span></h2>
          <div className="list">
            {lists[m].map((e) => (
              <div key={e}>
                <button className={open?.exercise === e ? 'item on' : 'item'} onClick={() => openExercise(m, e)}>
                  {e} {setsOf(e).length > 0 && <span className="badge">{setsOf(e).length}</span>}
                </button>
                {open?.exercise === e && (
                  <div className="panel">
                    <p className="muted">
                      {!last[e] ? 'Chargement…' : last[e].length
                        ? <>Dernière fois ({formatDate(last[e][0].date)}) : {last[e].map((p) => `${p.weight_kg}×${p.reps}`).join(' · ')}</>
                        : 'Première fois sur cet exercice'}
                    </p>
                    {setsOf(e).map((s, i) => (
                      <div key={s.id} className="row set">
                        <span>{i + 1}. {s.weight_kg} kg × {s.reps}</span>
                        <button className="icon" onClick={() => remove(s.id)} aria-label="Supprimer">×</button>
                      </div>
                    ))}
                    <div className="inputs">
                      <div className="stepper">
                        <button onClick={() => setWeight(step(weight, -2.5))}>−</button>
                        <input inputMode="decimal" value={weight} onChange={(ev) => setWeight(ev.target.value)} aria-label="Poids (kg)" />
                        <button onClick={() => setWeight(step(weight, 2.5))}>+</button>
                        <small>kg</small>
                      </div>
                      <div className="stepper">
                        <button onClick={() => setReps(step(reps, -1))}>−</button>
                        <input inputMode="numeric" value={reps} onChange={(ev) => setReps(ev.target.value)} aria-label="Répétitions" />
                        <button onClick={() => setReps(step(reps, 1))}>+</button>
                        <small>reps</small>
                      </div>
                    </div>
                    <button className="primary" disabled={busy || !weight || !reps} onClick={add}>Ajouter la série</button>
                  </div>
                )}
              </div>
            ))}
            <form className="row" onSubmit={(ev) => {
              ev.preventDefault();
              addCustom(m, (ev.currentTarget.elements.namedItem('exercise') as HTMLInputElement).value);
              ev.currentTarget.reset();
            }}>
              <input name="exercise" placeholder="Autre exercice…" />
              <button>OK</button>
            </form>
          </div>
        </section>
      ))}

      <h2>Ajouter un muscle</h2>
      <div className="chips">
        {MUSCLES.filter((m) => !muscles.includes(m)).map((m) => (
          <button key={m} className="chip" onClick={() => setMuscles((ms) => MUSCLES.filter((x) => ms.includes(x) || x === m))}>+ {m}</button>
        ))}
      </div>
    </>
  );
}
