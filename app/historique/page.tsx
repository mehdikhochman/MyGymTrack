import Link from 'next/link';
import { formatDate } from '@/lib/config';
import { sql } from '@/lib/db';

export default async function History() {
  const sessions = await sql`
    select se.id, se.date::text as date, count(s.id)::int as sets, coalesce(string_agg(distinct s.muscle, ', '), '') as muscles
    from sessions se left join sets s on s.session_id = se.id
    group by se.id order by se.date desc, se.id desc limit 200`;
  return (
    <>
      <h1>Historique</h1>
      {sessions.length === 0 && <p className="muted">Aucune séance pour l&apos;instant.</p>}
      <div className="list">
        {sessions.map((s) => (
          <Link key={s.id} href={`/seance/${s.id}`} className="item">
            <b>{formatDate(s.date)}</b> <span className="muted">{s.muscles || 'vide'} · {s.sets} séries</span>
          </Link>
        ))}
      </div>
    </>
  );
}
