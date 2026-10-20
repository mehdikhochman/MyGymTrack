import { notFound } from 'next/navigation';
import SessionLogger, { type Card } from '@/components/SessionLogger';
import { requireUser } from '@/lib/auth';
import { bestLifts, currentPlan, customExercises, getSettings, lastPerformances, sql, type Set } from '@/lib/db';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [[session], rows, last, best, settings, custom, plan] = await Promise.all([
    sql`select id, date::text as date, title, plan_day, (select min(created_at) from sets where session_id = ${id}) as started
      from sessions where id = ${id} and user_id = ${user.id}`,
    sql`select s.id, s.session_id, s.muscle, s.exercise, s.weight_kg, s.reps from sets s join sessions se on se.id = s.session_id
      where s.session_id = ${id} and se.user_id = ${user.id} order by s.id`,
    lastPerformances(user.id, id),
    bestLifts(user.id, id),
    getSettings(user.id),
    customExercises(user.id),
    currentPlan(user.id),
  ]);
  if (!session) notFound();
  const day = session.plan_day !== null ? plan?.days?.[session.plan_day] : undefined;
  const planned: Card[] = day?.exercises.map((e) => ({ name: e.name, group: e.group, sets: e.sets, reps: e.reps, rest: e.rest, note: e.note })) ?? [];
  return (
    <SessionLogger sessionId={id} title={session.title ?? 'Séance'} date={session.date}
      startedAt={session.started ? new Date(session.started).getTime() : Date.now()}
      planned={planned} initialSets={rows as Set[]} last={last} best={best} rest={Number(settings.rest)} custom={custom} />
  );
}
