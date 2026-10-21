import Link from 'next/link';
import { CoachRun, PlanForm } from '@/components/CoachForms';
import Icon from '@/components/Icon';
import { Thumb } from '@/components/ExerciseDemo';
import { Meter } from '@/components/Streak';
import { requireUser } from '@/lib/auth';
import { aiEnabled } from '@/lib/ai';
import { addDays, formatDate, plural, today } from '@/lib/config';
import { currentPlan, getSettings, sql, weeklySets } from '@/lib/db';
import { exerciseById } from '@/lib/exercises';
import { weeklySetsOf } from '@/lib/plan';

export const maxDuration = 120; // AI programme generation

// Report = blocks separated by a blank line, each starting with its heading.
function Report({ content }: { content: string }) {
  return (
    <div className="stack">
      {content.split('\n\n').map((block, i) => {
        const [title, ...lines] = block.split('\n');
        return <div key={i}><h3>{title}</h3><p className="pre muted">{lines.join('\n')}</p></div>;
      })}
    </div>
  );
}

const SOURCE: Record<string, string> = { ai: 'Coach IA', template: 'Programme de base', routine: 'Ma routine' };

const when = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

export default async function Coach() {
  const user = await requireUser();
  const [plan, done, reports, notes, settings, [{ n: logged }]] = await Promise.all([
    currentPlan(user.id),
    weeklySets(user.id),
    sql`select id, created_at, content from coach_reports where user_id = ${user.id} order by id desc limit 6`,
    sql`select id, title, summary, source_url, created_at from research_notes order by id desc limit 10`,
    getSettings(user.id),
    sql`select count(*)::int as n from sessions se where se.user_id = ${user.id} and se.date > ${addDays(today(), -42)}
      and (select count(*) from sets where session_id = se.id) >= 3`,
  ]);
  const hasHistory = logged > 0;
  const ai = aiEnabled();
  const volume = plan ? weeklySetsOf(plan) : {};
  const [latest, ...older] = reports;

  return (
    <>
      <h1>Coach</h1>
      <p className="lede">Ton programme, tes séries de la semaine et l’analyse de tes données.</p>

      {plan ? (
        <>
          <div className="card">
            <div className="workout-head">
              <h2 style={{ margin: 0 }}>{plan.name}</h2>
              <span className={plan.source === 'template' ? 'badge gold' : plan.source === 'routine' ? 'badge green' : 'badge'}>{SOURCE[plan.source] ?? 'Programme'}</span>
            </div>
            <p className="muted small">Depuis le {formatDate(plan.created_at.slice(0, 10))} · {plural(plan.days.length, 'séance')} en rotation</p>
            <p style={{ marginTop: 8 }}>{plan.summary}</p>
          </div>

          <h2>Séries cette semaine</h2>
          <div className="card">
            {Object.entries(volume).sort((a, b) => b[1] - a[1]).map(([group, target]) => (
              <Meter key={group} label={group} value={done[group] ?? 0} target={target} unit="séries" />
            ))}
            <p className="muted tiny">Objectif fixé par le programme ; chaque série « dure » (proche de l’échec) compte.</p>
          </div>

          <h2>Les séances</h2>
          {plan.days.map((d, i) => (
            <details key={i} className="card" open={i === 0}>
              <summary><b>{d.name}</b> <span className="muted small">· {d.focus}</span></summary>
              <div className="list" style={{ margin: '8px -16px -8px' }}>
                {d.exercises.map((e) => (
                  <Link key={e.id} href={exerciseById(e.id) ? `/exercices/${e.id}` : `/exercices?q=${encodeURIComponent(e.name)}`} className="item">
                    <Thumb id={e.id} images={exerciseById(e.id)?.images} />
                    <span className="grow">
                      <span className="ellipsis" style={{ display: 'block', fontWeight: 700 }}>{e.name}</span>
                      <span className="muted small">{e.sets} × {e.reps[0]}-{e.reps[1]} · repos {e.rest >= 120 ? `${String(Math.round(e.rest / 60 * 10) / 10).replace(".", ",")} min` : `${e.rest} s`}</span>
                      {e.note && <span className="muted tiny" style={{ display: 'block' }}>{e.note}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </>
      ) : (
        <p className="muted">Pas encore de programme.</p>
      )}

      <PlanForm ai={ai} split={settings.split ?? 'keep'} hasHistory={hasHistory} />
      <Link href="/exercices" className="card row"><span><Icon name="book" /> <b>Bibliothèque : 657 exercices</b></span><Icon name="chevron" size={18} /></Link>

      <h2>Bilan de la semaine</h2>
      {ai ? <CoachRun /> : <p className="muted">Le coach IA n’est pas activé sur ce site (aucune clé OPENROUTER_API_KEY ou ANTHROPIC_API_KEY).</p>}
      {latest && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="muted small">Dernier bilan · {when(latest.created_at)}</p>
          <div className="divider" />
          <Report content={latest.content} />
        </div>
      )}
      {older.map((r) => (
        <details key={r.id} className="card">
          <summary>Bilan du {when(r.created_at)}</summary>
          <Report content={r.content} />
        </details>
      ))}

      {notes.length > 0 && (
        <>
          <h2>Veille scientifique</h2>
          <p className="muted small">Résumés d’études récentes trouvés chaque semaine par le coach.</p>
          {notes.map((n) => (
            <div key={n.id} className="card">
              <h3>{n.title}</h3>
              <p className="muted small" style={{ margin: '6px 0' }}>{n.summary}</p>
              <a href={n.source_url} target="_blank" rel="noopener noreferrer nofollow" className="small">Source · {new URL(n.source_url).hostname}</a>
            </div>
          ))}
        </>
      )}
    </>
  );
}
