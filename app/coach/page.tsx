import { deleteNote, runCoach } from '../actions';
import Submit from '@/components/Submit';
import { sql } from '@/lib/db';

export const maxDuration = 60;

// Report = blocks separated by a blank line, each starting with its heading.
function Report({ content }: { content: string }) {
  return content.split('\n\n').map((block, i) => {
    const [title, ...lines] = block.split('\n');
    return <div key={i}><h3>{title}</h3><p className="pre">{lines.join('\n')}</p></div>;
  });
}

export default async function Coach() {
  const [reports, notes] = await Promise.all([
    sql`select id, created_at, content from coach_reports order by id desc limit 10`,
    sql`select id, title, summary, source_url, created_at from research_notes order by id desc`,
  ]);
  const when = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
  const [latest, ...older] = reports;

  return (
    <>
      <h1>Coach</h1>
      <form action={runCoach}>
        <Submit className="primary" pendingText="Analyse en cours…">Analyser ma semaine</Submit>
      </form>

      {latest && (
        <div className="card">
          <p className="muted">{when(latest.created_at)}</p>
          <Report content={latest.content} />
        </div>
      )}
      {older.map((r) => (
        <details key={r.id} className="card">
          <summary>Rapport du {when(r.created_at)}</summary>
          <Report content={r.content} />
        </details>
      ))}

      <h2>Notes de recherche</h2>
      {notes.length === 0 && <p className="muted">Les notes arrivent chaque lundi.</p>}
      {notes.map((n) => (
        <div key={n.id} className="card">
          <div className="row">
            <h3>{n.title}</h3>
            <form action={deleteNote.bind(null, n.id)}>
              <Submit className="icon" confirm="Supprimer cette note ?">×</Submit>
            </form>
          </div>
          <p>{n.summary}</p>
          <p className="muted">{when(n.created_at)} · <a href={n.source_url} target="_blank" rel="noopener noreferrer">Source</a></p>
        </div>
      ))}
    </>
  );
}
