'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addSet, deleteSet } from '@/app/actions';
import Exercise3D from './Exercise3D';
import Icon from './Icon';
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

const format = (p: { weight_kg: number; reps: number }) => `${p.weight_kg} kg × ${p.reps}`;
const short = (p: { weight_kg: number; reps: number }) => `${p.weight_kg}×${p.reps}`;

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

  // Unchecking a set deletes it and puts its values back in the input row (one tap to redo it).
  function uncheck(set: Set) {
    setWeight(String(set.weight_kg));
    setReps(String(set.reps));
    remove(set);
  }

  const done = [...new Set(sets.map((s) => s.exercise))];
  const volume = sets.reduce((t, s) => t + s.weight_kg * s.reps, 0);

  return (
    <>
      <div className="session-stats">
        <div><span className="muted small">Séries</span><b>{sets.length}</b></div>
        <div><span className="muted small">Volume</span><b>{Math.round(volume).toLocaleString('fr-FR')} kg</b></div>
        <div><span className="muted small">Exercices</span><b>{done.length}</b></div>
      </div>

      {done.length > 0 && (
        <div className="card">
          {done.map((e) => (
            <p key={e} className="small"><b>{e}</b> <span className="muted">{setsOf(e).map(short).join(' · ')}</span></p>
          ))}
        </div>
      )}

      {muscles.map((m) => (
        <section key={m}>
          <h2>{m} · {plural(sets.filter((s) => s.muscle === m).length, 'série')}</h2>
          <div className="list">
            {lists[m].map((e) => (
              <div key={e}>
                <button className={open?.exercise === e ? 'item on' : 'item'} onClick={() => openExercise(m, e)}>
                  <span className="grow">{e}</span>
                  {setsOf(e).length > 0 && <span className="badge">{setsOf(e).length}</span>}
                  <span className="chev"><Icon name="chevron" size={18} /></span>
                </button>
                {open?.exercise === e && (
                  <div className="exercise-body">
                    <div className="row">
                      <p className="muted small">
                        {last[e] ? <>Dernière fois · {formatDate(last[e][0].date)}</> : 'Première fois sur cet exercice'}
                      </p>
                      <button className="ghost" onClick={() => setDemo(!demo)}><Icon name="cube" size={18} /> {demo ? 'Masquer' : '3D'}</button>
                    </div>
                    {last[e] && <span className="target">🎯 Objectif {format(nextTarget(last[e]))}</span>}
                    {demo && <Exercise3D move={moveFor(e, m)} />}
                    <table className="sets">
                      <thead>
                        <tr><th>Série</th><th>Précédent</th><th>kg</th><th>Reps</th><th>✓</th></tr>
                      </thead>
                      <tbody>
                        {setsOf(e).map((s, i) => (
                          <tr key={s.id} className="done">
                            <td>{best[e] !== undefined && e1rm(s) > best[e] ? <span className="pr" title="Record">🏆</span> : i + 1}</td>
                            <td className="prev">{last[e]?.[i] ? short(last[e][i]) : '—'}</td>
                            <td>{s.weight_kg}</td>
                            <td>{s.reps}</td>
                            <td><button className="check on" onClick={() => uncheck(s)} aria-label="Annuler la série"><Icon name="check" /></button></td>
                          </tr>
                        ))}
                        <tr>
                          <td>{setsOf(e).length + 1}</td>
                          <td className="prev">{last[e]?.[setsOf(e).length] ? short(last[e][setsOf(e).length]) : '—'}</td>
                          <td><input inputMode="decimal" value={weight} onChange={(ev) => setWeight(ev.target.value)} aria-label="Poids (kg)" /></td>
                          <td><input inputMode="numeric" value={reps} onChange={(ev) => setReps(ev.target.value)} aria-label="Répétitions" /></td>
                          <td><button className="check" disabled={!weight || !reps} onClick={add} aria-label="Valider la série"><Icon name="check" /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            <form className="item" onSubmit={(ev) => {
              ev.preventDefault();
              addCustom(m, (ev.currentTarget.elements.namedItem('exercise') as HTMLInputElement).value);
              ev.currentTarget.reset();
            }}>
              <input name="exercise" placeholder="Autre exercice…" />
              <button className="ghost">Ajouter</button>
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

      <button className="danger end" onClick={removeSession}>Supprimer la séance</button>
      <RestTimer end={restEnd} setEnd={setRestEnd} />
    </>
  );
}
