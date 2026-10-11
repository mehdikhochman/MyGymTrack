import { notFound } from 'next/navigation';
import { deleteSession } from '../../actions';
import SessionLogger from '@/components/SessionLogger';
import Submit from '@/components/Submit';
import { EXERCISES, MUSCLES, formatDate } from '@/lib/config';
import { sql, type Set } from '@/lib/db';

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const id = Number((await params).id);
  const picked = ((await searchParams).m ?? '').split(',');
  const [[session], rows, used] = await Promise.all([
    sql`select id, date::text as date from sessions where id = ${id}`,
    sql`select id, session_id, muscle, exercise, weight_kg, reps from sets where session_id = ${id} order by id`,
    sql`select distinct muscle, exercise from sets order by exercise`,
  ]);
  if (!session) notFound();
  const sets = rows as Set[];

  // Predefined exercises plus any custom ones used before.
  const exercises = Object.fromEntries(MUSCLES.map((m) => [m, [...EXERCISES[m]]]));
  for (const u of used) if (!exercises[u.muscle]?.includes(u.exercise)) exercises[u.muscle]?.push(u.exercise);
  const muscles = MUSCLES.filter((m) => picked.includes(m) || sets.some((s) => s.muscle === m));

  return (
    <>
      <h1>Séance · {formatDate(session.date)}</h1>
      <SessionLogger sessionId={id} initialMuscles={muscles} initialSets={sets} exercises={exercises} />
      <form action={deleteSession.bind(null, id)} className="danger-zone">
        <Submit className="danger" pendingText="…" confirm="Supprimer cette séance et toutes ses séries ?">Supprimer la séance</Submit>
      </form>
    </>
  );
}
