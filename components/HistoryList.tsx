'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { deleteSession } from '@/app/actions';
import Icon from './Icon';
import { plural } from '@/lib/config';
import { deletedSessions, unsentDeletes } from '@/lib/instant';

type Session = { id: number; date: string; sets: number; volume: number; muscles: string };

const day = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', { ...opts, timeZone: 'UTC' });

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
          <span className="date-chip"><b>{day(s.date, { day: 'numeric' })}</b><small>{day(s.date, { month: 'short' })}</small></span>
          <span className="grow">
            {s.muscles || 'Séance vide'}
            <br />
            <span className="muted small">{day(s.date, { weekday: 'long' })} · {plural(s.sets, 'série')} · {s.volume.toLocaleString('fr-FR')} kg</span>
          </span>
          <span className="chev"><Icon name="chevron" size={18} /></span>
        </Link>
      ))}
    </div>
  );
}
