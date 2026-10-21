'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addSet, deleteSet } from '@/app/actions';
import ExerciseDemo, { Thumb } from './ExerciseDemo';
import ExercisePicker, { type Picked } from './ExercisePicker';
import Icon from './Icon';
import RestTimer, { unlockSound } from './RestTimer';
import { e1rm, nextTarget, plural, weightStep } from '@/lib/config';
import { exerciseByName } from '@/lib/exercises';
import { deletedSessions, unsentDeletes } from '@/lib/instant';
import type { Perf, Set } from '@/lib/db';

// One exercise of the session: planned by the coach, or added during the session.
export type Card = { name: string; group: string; sets: number; reps?: [number, number]; rest?: number; note?: string };

type Props = {
  sessionId: number | Promise<number>; // a promise while a new session is still being created
  title: string;
  date: string;
  startedAt: number;
  planned: Card[];
  initialSets: Set[];
  last: Record<string, Perf[]>;
  best: Record<string, number>; // best estimated 1RM before this session
  rest: number; // default rest, seconds
  custom: { name: string; group: string }[];
};

const short = (p: { weight_kg: number; reps: number }) => `${p.weight_kg}×${p.reps}`;

// Every action updates the screen first and syncs with the server in the background.
export default function SessionLogger({ sessionId, title, startedAt, planned, initialSets, last: lastProp, best: bestProp, rest, custom }: Props) {
  const router = useRouter();
  // Frozen: later refreshes would include this session's own sets.
  const [last] = useState(lastProp);
  const [best] = useState(bestProp);
  const [sets, setSets] = useState(initialSets);
  const [cards, setCards] = useState<Card[]>(() => [
    ...planned,
    ...[...new Set(initialSets.map((s) => s.exercise))].filter((n) => !planned.some((c) => c.name === n))
      .map((name) => ({ name, group: initialSets.find((s) => s.exercise === name)!.muscle, sets: 0 })),
  ]);
  const setsOf = (name: string) => sets.filter((s) => s.exercise === name);
  const [open, setOpen] = useState<string | null>(() => cards.find((c) => setsOf(c.name).length < c.sets)?.name ?? cards[0]?.name ?? null);
  const [extra, setExtra] = useState<Record<string, number>>({}); // rows added beyond the plan
  const [values, setValues] = useState<Record<string, { w: string; r: string }>>({});
  const [picker, setPicker] = useState<null | { swap?: string; group?: string }>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(rest);
  const [now, setNow] = useState(() => Date.now());
  const saving = useRef(new Map<number, Promise<Set>>()); // temporary id -> saved row
  const nextTempId = useRef(-1);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Today's target for an exercise: double progression from last time, within the coach's rep range.
  function target(c: Card) {
    const prev = last[c.name];
    if (prev) return nextTarget(prev, c.reps ?? [6, 12], weightStep(exerciseByName(c.name)?.equipment));
    return c.reps ? { weight_kg: NaN, reps: c.reps[0] } : null;
  }
  function inputs(c: Card) {
    if (values[c.name]) return values[c.name];
    const done = setsOf(c.name).at(-1);
    const t = done ?? target(c);
    return { w: t && Number.isFinite(t.weight_kg) ? String(t.weight_kg) : '', r: t ? String(t.reps) : '' };
  }
  const setInput = (c: Card, k: 'w' | 'r', v: string) => setValues((x) => ({ ...x, [c.name]: { ...inputs(c), [k]: v } }));

  function add(c: Card) {
    const { w, r } = inputs(c);
    const weight_kg = Number(w.replace(',', '.') || '0');
    const reps = Math.round(Number(r));
    if (!(weight_kg >= 0) || !(reps > 0)) return alert('Série invalide : vérifie le poids et les répétitions.');
    const row = { session_id: 0, muscle: c.group, exercise: c.name, weight_kg, reps };
    const temp: Set = { id: nextTempId.current--, ...row };
    const done = setsOf(c.name).length;
    if (done >= c.sets) setExtra((x) => ({ ...x, [c.name]: Math.max(0, (x[c.name] ?? 0) - 1) }));
    setSets((s) => [...s, temp]);
    setValues((x) => ({ ...x, [c.name]: { w, r } }));
    unlockSound();
    const seconds = c.rest ?? rest;
    setRestTotal(seconds);
    setRestEnd(Date.now() + seconds * 1000);
    // Exercise complete: open the next unfinished one.
    if (done + 1 >= c.sets + (extra[c.name] ?? 0) && c.sets > 0) {
      const next = cards.find((x) => x.name !== c.name && setsOf(x.name).length < x.sets);
      if (next) setOpen(next.name);
    }
    const saved = Promise.resolve(sessionId).then((session_id) => addSet({ ...row, session_id }));
    saving.current.set(temp.id, saved);
    saved.then(
      (real) => setSets((s) => s.map((x) => (x.id === temp.id ? real : x))),
      () => {
        setSets((s) => s.filter((x) => x.id !== temp.id));
        alert("La série n'a pas pu être enregistrée.");
      },
    );
  }

  // Unchecking a set deletes it and puts its values back in the input row (one tap to redo it).
  async function uncheck(set: Set) {
    setValues((x) => ({ ...x, [set.exercise]: { w: String(set.weight_kg), r: String(set.reps) } }));
    setSets((s) => s.filter((x) => x.id !== set.id));
    try {
      const id = set.id < 0 ? (await saving.current.get(set.id))!.id : set.id;
      await deleteSet(id);
    } catch {
      setSets((s) => [...s, set]);
      alert("La série n'a pas pu être supprimée.");
    }
  }

  function pick(p: Picked) {
    const swap = picker?.swap;
    setPicker(null);
    if (cards.some((c) => c.name === p.name)) return setOpen(p.name);
    setCards((cs) => {
      if (!swap) return [...cs, { name: p.name, group: p.group, sets: 3 }];
      return cs.map((c) => (c.name === swap ? { ...c, name: p.name, group: p.group, note: undefined } : c));
    });
    setOpen(p.name);
  }

  async function finish(remove = false) {
    if (remove && !confirm('Supprimer cette séance et toutes ses séries ?')) return;
    if (remove || sets.length === 0) {
      const id = await sessionId;
      deletedSessions.add(id);
      unsentDeletes.add(id); // sent once the next page is shown (see Nav)
    }
    router.push('/');
  }

  const minutes = Math.max(0, Math.floor((now - startedAt) / 60_000));

  return (
    <>
      <header className="s-head">
        <Link href="/" className="icon-btn" aria-label="Retour"><Icon name="back" /></Link>
        <div className="title">
          <b className="ellipsis">{title}</b>
          <span className="muted small">{minutes} min · {plural(sets.length, 'série')} faite{sets.length > 1 ? 's' : ''}</span>
        </div>
        <button className="primary finish" onClick={() => finish()}>Terminer</button>
      </header>

      {cards.map((c, idx) => {
        const lib = exerciseByName(c.name);
        const done = setsOf(c.name);
        const pending = Math.max(0, c.sets - done.length) + (extra[c.name] ?? 0);
        const isOpen = open === c.name;
        const t = target(c);
        const prev = last[c.name];
        const v = inputs(c);
        return (
          <section key={c.name} className={done.length >= c.sets && c.sets > 0 ? 'ex done' : 'ex'}>
            <button className="ex-head" onClick={() => setOpen(isOpen ? null : c.name)} aria-expanded={isOpen}>
              <Thumb id={lib?.id} images={lib?.images} />
              <span className="grow">
                <span className="name">{c.name}</span>
                <span className="muted small" style={{ display: 'block' }}>
                  {c.sets > 0 ? `${done.length}/${c.sets} séries` : plural(done.length, 'série')}
                  {c.reps && ` · ${c.reps[0]}-${c.reps[1]} reps`} · {idx + 1}/{cards.length}
                </span>
              </span>
              <span className={isOpen ? 'chev open' : 'chev'}><Icon name="chevron" size={18} /></span>
            </button>
            {isOpen && (
              <div className="ex-body">
                {lib && lib.images > 0 && <ExerciseDemo id={lib.id} name={c.name} />}
                {prev && t && Number.isFinite(t.weight_kg) && (
                  <span className="target"><Icon name="trophy" size={16} /> Objectif du jour : {String(t.weight_kg).replace('.', ',')} kg × {t.reps}</span>
                )}
                {c.note && <p className="note">{c.note}</p>}
                {!prev && <p className="muted small">Première fois : choisis une charge que tu soulèves proprement.</p>}
                <table className="sets">
                  <thead><tr><th>Série</th><th>Dernière fois</th><th>kg</th><th>Reps</th><th><span className="sr">Fait</span></th></tr></thead>
                  <tbody>
                    {done.map((s, i) => {
                      const record = best[c.name] !== undefined && e1rm(s) > best[c.name];
                      return (
                        <tr key={s.id} className={record ? 'done record' : 'done'}>
                          <td>{record ? <span title="Record">🏆</span> : i + 1}</td>
                          <td className="prev">{prev?.[i] ? short(prev[i]) : '—'}</td>
                          <td className="v">{s.weight_kg}</td>
                          <td className="v">{s.reps}</td>
                          <td><button className="check on" onClick={() => uncheck(s)} aria-label={`Annuler la série ${i + 1}`}><Icon name="check" /></button></td>
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(1, pending) }, (_, k) => {
                      const i = done.length + k;
                      return k === 0 ? (
                        <tr key="current">
                          <td>{i + 1}</td>
                          <td className="prev">{prev?.[i] ? short(prev[i]) : '—'}</td>
                          <td><input inputMode="decimal" value={v.w} placeholder="kg" onChange={(e) => setInput(c, 'w', e.target.value)} aria-label="Poids (kg)" /></td>
                          <td><input inputMode="numeric" value={v.r} placeholder="reps" onChange={(e) => setInput(c, 'r', e.target.value)} aria-label="Répétitions" /></td>
                          <td><button className="check go" disabled={!v.r} onClick={() => add(c)} aria-label="Valider la série"><Icon name="check" /></button></td>
                        </tr>
                      ) : (
                        <tr key={k} className="muted">
                          <td>{i + 1}</td>
                          <td className="prev">{prev?.[i] ? short(prev[i]) : '—'}</td>
                          <td className="prev">{v.w || '—'}</td>
                          <td className="prev">{v.r || '—'}</td>
                          <td />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="row">
                  <button className="ghost" onClick={() => setExtra((x) => ({ ...x, [c.name]: (x[c.name] ?? 0) + 1 }))}><Icon name="plus" size={18} /> Série</button>
                  {done.length === 0 && (
                    <button className="ghost" onClick={() => setPicker({ swap: c.name, group: c.group })}><Icon name="swap" size={18} /> Remplacer</button>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <button className="big" onClick={() => setPicker({})}><Icon name="plus" /> Ajouter un exercice</button>
      <button className="danger end" onClick={() => finish(true)}>Supprimer la séance</button>

      {picker && <ExercisePicker custom={custom} group={picker.group} onPick={pick} onClose={() => setPicker(null)} />}
      <RestTimer end={restEnd} total={restTotal} setEnd={setRestEnd} />
    </>
  );
}
