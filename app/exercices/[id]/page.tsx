import { notFound } from 'next/navigation';
import ExerciseDemo from '@/components/ExerciseDemo';
import Steps from '@/components/Steps';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai';
import { formatDate } from '@/lib/config';
import { sql } from '@/lib/db';
import { exerciseById } from '@/lib/exercises';
import steps from '@/lib/exercise-steps.json';

const LEVEL = ['Débutant', 'Intermédiaire', 'Confirmé'];

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const e = exerciseById((await params).id);
  if (!e) notFound();
  const [[fr], history] = await Promise.all([
    sql`select steps from exercise_fr where id = ${e.id}`,
    sql`
      select se.date::text as date, string_agg(s.weight_kg || '×' || s.reps, '  ' order by s.id) as sets,
        max(s.weight_kg * (1 + s.reps / 30.0))::real as best
      from sets s join sessions se on se.id = s.session_id
      where se.user_id = ${user.id} and s.exercise = ${e.name}
      group by se.id, se.date order by se.date desc limit 8`,
  ]);
  return (
    <>
      <h1>{e.name}</h1>
      <p className="lede">{e.en}</p>
      {e.images > 0 && <ExerciseDemo id={e.id} name={e.name} />}
      <div className="chips" style={{ margin: '12px 0' }}>
        <span className="badge">{e.group}</span>
        <span className="badge gold">{e.equipment}</span>
        <span className="badge green">{LEVEL[e.level]}</span>
        <span className="badge">{e.compound ? 'Polyarticulaire' : 'Isolation'}</span>
      </div>
      <div className="card">
        <p><b>Muscles ciblés :</b> {e.muscles.join(', ')}</p>
        {e.secondary.length > 0 && <p className="muted small">Secondaires : {e.secondary.join(', ')}</p>}
      </div>
      <h2>Exécution</h2>
      <div className="card">
        <Steps id={e.id} en={(steps as Record<string, string[]>)[e.id] ?? []} fr={(fr?.steps as string[]) ?? null} ai={aiEnabled()} />
      </div>
      {history.length > 0 && (
        <>
          <h2>Tes séances</h2>
          <div className="card flush list">
            {history.map((h) => (
              <div key={h.date + h.sets} className="item">
                <span className="grow"><b>{formatDate(h.date)}</b><span className="muted small" style={{ display: 'block' }}>{h.sets}</span></span>
                <span className="num" style={{ fontSize: 18 }}>{Math.round(h.best)} kg</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="muted tiny end">Photos et consignes : free-exercise-db (domaine public).</p>
    </>
  );
}
