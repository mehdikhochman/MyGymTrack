'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addSet, deleteSet } from '@/app/actions';
import Exercise3D from './Exercise3D';
import RestTimer, { unlockSound } from './RestTimer';
import { MUSCLES, e1rm, formatDate, nextTarget, plural } from '@/lib/config';
import { deletedSessions, unsentDeletes } from '@/lib/instant';
import { moveFor } from '@/lib/moves';
import type { Perf, Set } from '@/lib/db';

type Props = {
  sessionId: number | Promise<number>; // a promise while a new session is still being created
  initialMuscles: string[];
  initialSets: Set[];
  exercises: Record<string, string[]>;
  last: Record<string, Perf[]>;
  best: Record<string, number>; // best estimated 1RM before this session
  rest: number; // seconds
};
type Open = { muscle: string; exercise: string };

const format = (p: { weight_kg: number; reps: number }) => `${p.weight_kg}×${p.reps}`;

// Every action updates the screen first and syncs with the server in the background.
export default function SessionLogger({ sessionId, initialMuscles, initialSets, exercises, last: lastProp, best: bestProp, rest }: Props) {
  const router = useRouter();
  // Frozen: later refreshes would include this session's own sets.
  const [last] = useState(lastProp);
  const [best] = useState(bestProp);
  const [muscles, setMuscles] = useState(initialMuscles);
  const [sets, setSets] = useState(initialSets);
  const [lists, setLists] = useState(exercises);
  const [open, setOpen] = useState<Open | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [demo, setDemo] = useState(false);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const saving = useRef(new Map<number, Promise<Set>>()); // temporary id -> saved row
  const nextTempId = useRef(-1);

  const setsOf = (exercise: string) => sets.filter((s) => s.exercise === exercise);

  function openExercise(muscle: string, exercise: string) {
    if (open?.exercise === exercise) return setOpen(null);
    setOpen({ muscle, exercise });
    setDemo(false);
    // Prefill with the latest set of this session, else today's progression target.
    const p = setsOf(exercise).at(-1) ?? (last[exercise] && nextTarget(last[exercise]));
    setWeight(p ? String(p.weight_kg) : '');
    setReps(p ? String(p.reps) : '');
  }

  function add() {
    const weight_kg = Number(weight.replace(',', '.'));
    const r = Math.round(Number(reps));
    if (!open || !(weight_kg >= 0) || !(r > 0)) return alert('Série invalide : vérifie le poids et les répétitions.');
    const temp: Set = { id: nextTempId.current--, session_id: 0, ...open, weight_kg, reps: r };
    setSets((s) => [...s, temp]);
    unlockSound();
    setRestEnd(Date.now() + rest * 1000);
    const saved = Promise.resolve(sessionId).then((session_id) => addSet({ session_id, ...open, weight_kg, reps: r }));
    saving.current.set(temp.id, saved);
    saved.then(
      (row) => setSets((s) => s.map((x) => (x.id === temp.id ? row : x))),
      () => {
        setSets((s) => s.filter((x) => x.id !== temp.id));
        alert("La série n'a pas pu être enregistrée.");
      },
    );
  }

  async function remove(set: Set) {
    setSets((s) => s.filter((x) => x.id !== set.id));
    try {
      const id = set.id < 0 ? (await saving.current.get(set.id))!.id : set.id;
      await deleteSet(id);
    } catch {
      setSets((s) => [...s, set]);
      alert("La série n'a pas pu être supprimée.");
    }
  }

  async function removeSession() {
    if (!confirm('Supprimer cette séance et toutes ses séries ?')) return;
    const id = await sessionId;
    deletedSessions.add(id);
    unsentDeletes.add(id);
    router.push('/historique');
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
            <p key={e} className="summary"><b>{e}</b> {setsOf(e).map(format).join(' · ')}</p>
          ))}
        </div>
      )}

      {muscles.map((m) => (
        <section key={m}>
          <h2>{m} <span className="muted">{plural(sets.filter((s) => s.muscle === m).length, 'série')}</span></h2>
          <div className="list">
            {lists[m].map((e) => (
              <div key={e}>
                <button className={open?.exercise === e ? 'item on' : 'item'} onClick={() => openExercise(m, e)}>
                  {e} {setsOf(e).length > 0 && <span className="badge">{setsOf(e).length}</span>}
                </button>
                {open?.exercise === e && (
                  <div className="panel">
                    <p className="muted">
                      {last[e]
                        ? <>Dernière fois ({formatDate(last[e][0].date)}) : {last[e].map(format).join(' · ')}</>
                        : 'Première fois sur cet exercice'}
                    </p>
                    {last[e] && (
                      <p className="target">Objectif : {format(nextTarget(last[e]))}</p>
                    )}
                    <button className="link" onClick={() => setDemo(!demo)}>{demo ? 'Masquer le mouvement' : '▶ Voir le mouvement en 3D'}</button>
                    {demo && <Exercise3D move={moveFor(e, m)} />}
                    {setsOf(e).map((s, i) => (
                      <div key={s.id} className="row set">
                        <span>
                          {i + 1}. {s.weight_kg} kg × {s.reps}
                          {best[e] !== undefined && e1rm(s) > best[e] && <span className="pr">🏆 Record</span>}
                        </span>
                        <button className="icon" onClick={() => remove(s)} aria-label="Supprimer">×</button>
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
                    <button className="primary" disabled={!weight || !reps} onClick={add}>Ajouter la série</button>
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

      <button className="danger danger-zone" onClick={removeSession}>Supprimer la séance</button>
      <RestTimer end={restEnd} setEnd={setRestEnd} />
    </>
  );
}
