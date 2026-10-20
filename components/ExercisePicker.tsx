'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { Thumb } from './ExerciseDemo';
import { MUSCLES } from '@/lib/config';
import { EXERCISES, normalize, searchExercises, type Exercise } from '@/lib/exercises';

export type Picked = { name: string; group: string; id?: string };
type Props = {
  custom: { name: string; group: string }[]; // exercises the user created
  group?: string; // pre-selected muscle group (e.g. to replace an exercise)
  onPick: (e: Picked) => void;
  onClose: () => void;
};

// Full-screen search over the 657 library exercises + the user's own ones.
export default function ExercisePicker({ custom, group: initialGroup, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(initialGroup);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const results = useMemo(() => {
    const own = custom
      .filter((c) => !EXERCISES.some((e) => e.name === c.name))
      .filter((c) => (!group || c.group === group) && normalize(c.name).includes(normalize(query)))
      .map((c) => ({ name: c.name, group: c.group }));
    // Compound and common (beginner) movements first.
    const lib = searchExercises(query, group).sort((a, b) => Number(b.compound) - Number(a.compound) || a.level - b.level);
    return [...own, ...lib].slice(0, 80) as (Picked & Partial<Exercise>)[];
  }, [query, group, custom]);

  const name = query.trim();
  return (
    <div className="sheet" role="dialog" aria-label="Choisir un exercice">
      <div className="inner">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Ajouter un exercice</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
        </div>
        <div className="search">
          <Icon name="search" size={20} />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher (ex. développé, squat, curl)" aria-label="Rechercher un exercice" />
        </div>
        <div className="chips scroll" style={{ margin: '10px -16px' }}>
          <button className={!group ? 'chip on' : 'chip'} onClick={() => setGroup(undefined)}>Tous</button>
          {MUSCLES.map((m) => <button key={m} className={group === m ? 'chip on' : 'chip'} onClick={() => setGroup(m)}>{m}</button>)}
        </div>
        <div className="card flush list">
          {results.map((e) => (
            <button key={e.name} className="item tap" onClick={() => onPick({ name: e.name, group: e.group, id: e.id })}>
              <Thumb id={e.id} images={e.images} />
              <span className="grow">
                <b>{e.name}</b>
                <span className="muted small" style={{ display: 'block' }}>{e.group}{e.equipment ? ` · ${e.equipment}` : ' · perso'}</span>
              </span>
              <Icon name="plus" />
            </button>
          ))}
          {results.length === 0 && <p className="muted" style={{ padding: 16 }}>Aucun exercice trouvé.</p>}
        </div>
        {name && !results.some((r) => normalize(r.name) === normalize(name)) && (
          group ? (
            <button className="end" onClick={() => onPick({ name: name.slice(0, 80), group })}>Créer « {name} » ({group})</button>
          ) : (
            <p className="muted small center end">Pour créer « {name} », choisis d’abord son groupe musculaire ci-dessus.</p>
          )
        )}
      </div>
    </div>
  );
}
