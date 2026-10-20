'use client';

import { useEffect, useState } from 'react';
import { imageUrl } from '@/lib/exercises';

// Start and end positions shown in turn: reads as the movement, without a 3D model.
export default function ExerciseDemo({ id, name }: { id: string; name: string }) {
  const [end, setEnd] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setEnd((e) => !e), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="demo" onClick={() => setEnd(!end)}>
      <img src={imageUrl(id, 0)} alt={`${name}, position de départ`} />
      <img src={imageUrl(id, 1)} alt={`${name}, position d’arrivée`} className={end ? '' : 'hidden'} />
    </div>
  );
}

export function Thumb({ id, images }: { id?: string; images?: number }) {
  return id && images ? <img className="thumb" src={imageUrl(id, 0)} alt="" loading="lazy" /> : <span className="thumb none">💪</span>;
}
