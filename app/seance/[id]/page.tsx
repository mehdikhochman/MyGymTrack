import { notFound } from 'next/navigation';
import SessionLogger from '@/components/SessionLogger';
import { MUSCLES, formatDate } from '@/lib/config';
import { exerciseLists, lastPerformances, sql, type Set } from '@/lib/db';

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const id = Number((await params).id);
  const picked = ((await searchParams).m ?? '').split(',');
  const [[session], rows, exercises, last] = await Promise.all([
    sql`select id, date::text as date from sessions where id = ${id}`,
    sql`select id, session_id, muscle, exercise, weight_kg, reps from sets where session_id = ${id} order by id`,
    exerciseLists(),
    lastPerformances(id),
  ]);
  if (!session) notFound();
  const sets = rows as Set[];
  const muscles = MUSCLES.filter((m) => picked.includes(m) || sets.some((s) => s.muscle === m));

  return (
    <>
      <h1>Séance · {formatDate(session.date)}</h1>
      <SessionLogger sessionId={id} initialMuscles={muscles} initialSets={sets} exercises={exercises} last={last} />
    </>
  );
}
