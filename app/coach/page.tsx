import CoachRun from '@/components/CoachRun';
import Notes from '@/components/Notes';
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
      <CoachRun />

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
      <Notes notes={notes.map((n) => ({ id: n.id, title: n.title, summary: n.summary, source_url: n.source_url, date: when(n.created_at) }))} />
    </>
  );
}
