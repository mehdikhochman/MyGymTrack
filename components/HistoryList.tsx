'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { deleteSession } from '@/app/actions';
import { formatDate, plural } from '@/lib/config';
import { deletedSessions, unsentDeletes } from '@/lib/instant';

type Session = { id: number; date: string; sets: number; muscles: string };

export default function HistoryList({ sessions }: { sessions: Session[] }) {
  useEffect(() => {
    for (const id of unsentDeletes) {
      unsentDeletes.delete(id);
      deleteSession(id).catch(() => alert("La séance n'a pas pu être supprimée."));
    }
  }, []);

  const visible = sessions.filter((s) => !deletedSessions.has(s.id));
  if (!visible.length) return <p className="muted">Aucune séance pour l&apos;instant.</p>;
  return (
    <div className="list">
      {visible.map((s) => (
        <Link key={s.id} href={`/seance/${s.id}`} prefetch className="item">
          <b>{formatDate(s.date)}</b> <span className="muted">{s.muscles || 'vide'} · {plural(s.sets, 'série')}</span>
        </Link>
      ))}
    </div>
  );
}
