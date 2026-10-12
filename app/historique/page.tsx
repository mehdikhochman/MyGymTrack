import HistoryList from '@/components/HistoryList';
import { sql } from '@/lib/db';

export default async function History() {
  const sessions = await sql`
    select se.id, se.date::text as date, count(s.id)::int as sets,
      coalesce(sum(s.weight_kg * s.reps), 0)::int as volume, coalesce(string_agg(distinct s.muscle, ', '), '') as muscles
    from sessions se left join sets s on s.session_id = se.id
    group by se.id order by se.date desc, se.id desc limit 200`;
  return (
    <>
      <h1>Historique</h1>
      <p className="subtitle">Tes séances, de la plus récente à la plus ancienne</p>
      <HistoryList sessions={sessions as Parameters<typeof HistoryList>[0]['sessions']} />
    </>
  );
}
