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
      <p className="lede">Ton programme et les conseils du coach.</p>

      {plan ? (
        <>
          <div className="card">
            <div className="workout-head">
              <h2 style={{ margin: 0 }}>{plan.name}</h2>
              <span className={plan.source === 'template' ? 'badge gold' : plan.source === 'routine' ? 'badge green' : 'badge'}>{SOURCE[plan.source] ?? 'Programme'}</span>
            </div>
            <p className="muted small">{plural(plan.days.length, 'séance')}, à faire dans l’ordre · depuis le {formatDate(plan.created_at.slice(0, 10))}</p>
            <p className="small" style={{ marginTop: 8 }}>{plan.summary}</p>
            <div className="list" style={{ margin: '10px -16px -8px' }}>
              {plan.days.map((d, i) => (
                <details key={i} className="item" style={{ display: 'block' }}>
                  <summary className="row" style={{ minHeight: 44 }}>
                    <b className="grow">{i + 1}. {d.name}</b>
                    <span className="muted small">{plural(d.exercises.length, 'exercice')} · {d.exercises.reduce((t, e) => t + e.sets, 0)} séries</span>
                    <span className="chev"><Icon name="chevron" size={18} /></span>
                  </summary>
                  <div className="list" style={{ margin: '4px -16px 0' }}>
                    {d.exercises.map((e) => (
                      <Link key={e.id} href={exerciseById(e.id) ? `/exercices/${e.id}` : `/exercices?q=${encodeURIComponent(e.name)}`} className="item">
                        <Thumb id={e.id} images={exerciseById(e.id)?.images} />
                        <span className="grow">
                          <span className="ellipsis" style={{ display: 'block', fontWeight: 700 }}>{e.name}</span>
                          <span className="muted small">{e.sets} séries de {e.reps[0]} à {e.reps[1]} · repos {e.rest >= 120 ? `${String(Math.round(e.rest / 60 * 10) / 10).replace('.', ',')} min` : `${e.rest} s`}</span>
                          {e.note && <span className="muted tiny" style={{ display: 'block' }}>{e.note}</span>}
                        </span>
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <h2>Séries faites cette semaine</h2>
          <div className="card">
            {Object.entries(volume).sort((a, b) => b[1] - a[1]).map(([group, target]) => (
              <Meter key={group} label={group} value={done[group] ?? 0} target={target} unit="séries" />
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Pas encore de programme : choisis-en un ci-dessous.</p>
      )}

      <PlanForm ai={ai} split={settings.split ?? 'keep'} hasHistory={hasHistory} open={!plan} />

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
          <h2>Pour aller plus loin</h2>
          <details className="card">
            <summary><b>Études récentes</b> <span className="muted small">({notes.length})</span></summary>
            {notes.map((n) => (
              <div key={n.id} style={{ marginTop: 14 }}>
                <h3>{n.title}</h3>
                <p className="muted small" style={{ margin: '6px 0' }}>{n.summary}</p>
                <a href={n.source_url} target="_blank" rel="noopener noreferrer nofollow" className="small">Source · {new URL(n.source_url).hostname}</a>
              </div>
            ))}
          </details>
        </>
      )}
      <Link href="/exercices" className="card row"><span><Icon name="book" /> <b>Tous les exercices</b> <span className="muted small">(657, avec photos)</span></span><Icon name="chevron" size={18} /></Link>
    </>
  );
}
