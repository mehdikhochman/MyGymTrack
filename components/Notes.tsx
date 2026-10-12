'use client';

import { deleteNote } from '@/app/actions';
import Icon from './Icon';
import { useInstantList } from './useInstantList';

export type Note = { id: number; title: string; summary: string; source_url: string; date: string };

// Research notes; deleting hides the note before the server answers.
export default function Notes({ notes }: { notes: Note[] }) {
  const { list, remove } = useInstantList(notes);

  if (!list.length) return <p className="muted">Les notes arrivent chaque lundi.</p>;
  return list.map((n) => (
    <div key={n.id} className="card">
      <div className="row">
        <h3>{n.title}</h3>
        <button className="icon-btn" onClick={() => confirm('Supprimer cette note ?') && remove(n.id, deleteNote, "La note n'a pas pu être supprimée.")} aria-label="Supprimer"><Icon name="x" size={18} /></button>
      </div>
      <p className="small">{n.summary}</p>
      <p className="muted small">{n.date} · <a href={n.source_url} target="_blank" rel="noopener noreferrer">Lire la source</a></p>
    </div>
  ));
}
