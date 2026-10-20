'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { Thumb } from './ExerciseDemo';
import { MUSCLES } from '@/lib/config';
import { EQUIPMENT, searchExercises } from '@/lib/exercises';

// Browse the whole library: search, filter by muscle group and equipment.
export default function Library({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState<string>();
  const [equipment, setEquipment] = useState<string>();
  const results = useMemo(
    () => searchExercises(query, group).filter((e) => !equipment || e.equipment === equipment)
      .sort((a, b) => Number(b.compound) - Number(a.compound) || a.level - b.level),
    [query, group, equipment],
  );
  return (
    <>
      <div className="search">
        <Icon name="search" size={20} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un exercice" aria-label="Rechercher un exercice" />
      </div>
      <div className="chips scroll" style={{ margin: '10px -16px 6px' }}>
        <button className={!group ? 'chip on' : 'chip'} onClick={() => setGroup(undefined)}>Tous les muscles</button>
        {MUSCLES.map((m) => <button key={m} className={group === m ? 'chip on' : 'chip'} onClick={() => setGroup(group === m ? undefined : m)}>{m}</button>)}
      </div>
      <div className="chips scroll" style={{ margin: '0 -16px 12px' }}>
        <button className={!equipment ? 'chip on' : 'chip'} onClick={() => setEquipment(undefined)}>Tout matériel</button>
        {EQUIPMENT.map((m) => <button key={m} className={equipment === m ? 'chip on' : 'chip'} onClick={() => setEquipment(equipment === m ? undefined : m)}>{m}</button>)}
      </div>
      <p className="muted small">{results.length} exercice{results.length > 1 ? 's' : ''}</p>
      <div className="card flush list">
        {results.slice(0, 150).map((e) => (
          <Link key={e.id} href={`/exercices/${e.id}`} prefetch={false} className="item">
            <Thumb id={e.id} images={e.images} />
            <span className="grow"><b className="ellipsis" style={{ display: 'block' }}>{e.name}</b><span className="muted small">{e.group} · {e.equipment}</span></span>
            <span className="chev"><Icon name="chevron" size={18} /></span>
          </Link>
        ))}
      </div>
      {results.length > 150 && <p className="muted small center">Affine ta recherche pour voir les autres.</p>}
    </>
  );
}
