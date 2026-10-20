import { sql } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { today } from '@/lib/config';

// Export: all of the user's data as JSON. Sets are nested in their session so ids never leak between accounts.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const uid = user.id;
  const [data] = await sql`
    select json_build_object(
      'version', 2,
      'exported_at', now(),
      'sessions', coalesce((select json_agg(json_build_object('date', se.date, 'title', se.title, 'plan_day', se.plan_day,
        'sets', coalesce((select json_agg(json_build_object('muscle', s.muscle, 'exercise', s.exercise, 'weight_kg', s.weight_kg, 'reps', s.reps, 'created_at', s.created_at) order by s.id)
          from sets s where s.session_id = se.id), '[]')) order by se.date, se.id) from sessions se where se.user_id = ${uid}), '[]'),
      'meals', coalesce((select json_agg(json_build_object('date', date, 'name', name, 'calories', calories, 'protein_g', protein_g, 'carbs_g', carbs_g, 'fat_g', fat_g) order by id)
        from meals where user_id = ${uid}), '[]'),
      'body_weight', coalesce((select json_agg(json_build_object('date', date, 'weight_kg', weight_kg) order by id) from body_weight where user_id = ${uid}), '[]'),
      'settings', coalesce((select json_agg(json_build_object('key', key, 'value', value) order by key) from settings where user_id = ${uid}), '[]'),
      'plans', coalesce((select json_agg(json_build_object('created_at', created_at, 'content', content) order by id) from plans where user_id = ${uid}), '[]'),
      'coach_reports', coalesce((select json_agg(json_build_object('created_at', created_at, 'content', content) order by id) from coach_reports where user_id = ${uid}), '[]')
    ) as data`;
  return new Response(JSON.stringify(data.data, null, 1), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="mygymtrack-${today()}.json"`,
    },
  });
}

type Backup = Record<'sessions' | 'meals' | 'body_weight' | 'settings' | 'plans' | 'coach_reports', unknown[]>;

// Version 1 exports (single-user app) had flat tables; nest the sets in their sessions.
function fromV1(d: Record<string, { [k: string]: unknown }[]>): Backup {
  return {
    sessions: d.sessions.map((s) => ({ ...s, sets: d.sets.filter((x) => x.session_id === s.id) })),
    meals: d.meals, body_weight: d.body_weight, settings: d.settings ?? [], plans: [], coach_reports: d.coach_reports ?? [],
  };
}

// Import: replaces the user's data with an export, in one transaction.
export async function POST(req: Request) {
  const back = (status: string) => Response.redirect(new URL(`/reglages?import=${status}`, req.url), 303);
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return Response.json({ error: 'Origine refusée' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });

  let data: Backup;
  try {
    const file = (await req.formData()).get('file') as File;
    if (file.size > 20_000_000) throw new Error();
    const raw = JSON.parse(await file.text());
    data = raw.version === 2 ? raw : fromV1(raw);
    for (const k of ['sessions', 'meals', 'body_weight', 'settings', 'plans', 'coach_reports'] as const) if (!Array.isArray(data[k])) throw new Error();
  } catch {
    return back('erreur');
  }
  const uid = user.id;
  const json = (k: keyof Backup) => JSON.stringify(data[k]);
  try {
    await sql.transaction([
      ...['sessions', 'meals', 'body_weight', 'settings', 'plans', 'coach_reports'].map((t) => sql.query(`delete from ${t} where user_id = $1`, [uid])),
      // New session ids are drawn first so each session's sets can point to it.
      sql`
        with src as materialized (
          select x.*, nextval(pg_get_serial_sequence('sessions', 'id')) as new_id
          from json_to_recordset(${json('sessions')}::json) as x(date date, title text, plan_day int, sets json)),
        ins as (insert into sessions (id, user_id, date, title, plan_day) select new_id, ${uid}, date, left(title, 60), plan_day from src)
        insert into sets (session_id, muscle, exercise, weight_kg, reps, created_at)
        select src.new_id, s.muscle, left(s.exercise, 80), s.weight_kg, s.reps, coalesce(s.created_at, now())
        from src, json_to_recordset(coalesce(src.sets, '[]')) as s(muscle text, exercise text, weight_kg real, reps int, created_at timestamptz)`,
      sql`
        insert into meals (user_id, date, name, calories, protein_g, carbs_g, fat_g)
        select ${uid}, date, left(name, 80), calories, coalesce(protein_g, 0), coalesce(carbs_g, 0), coalesce(fat_g, 0)
        from json_to_recordset(${json('meals')}::json) as x(date date, name text, calories int, protein_g real, carbs_g real, fat_g real)`,
      sql`
        insert into body_weight (user_id, date, weight_kg)
        select ${uid}, date, weight_kg from json_to_recordset(${json('body_weight')}::json) as x(date date, weight_kg real)`,
      sql`
        insert into settings (user_id, key, value)
        select ${uid}, key, value from json_to_recordset(${json('settings')}::json) as x(key text, value text)
        where key in ('kcal', 'protein', 'carbs', 'fat', 'rest', 'milestone') and value ~ '^[0-9]{1,5}$'`,
      sql`
        insert into plans (user_id, created_at, content)
        select ${uid}, coalesce(created_at, now()), content from json_to_recordset(${json('plans')}::json) as x(created_at timestamptz, content jsonb)
        where jsonb_typeof(content -> 'days') = 'array'`,
      sql`
        insert into coach_reports (user_id, created_at, content)
        select ${uid}, coalesce(created_at, now()), content from json_to_recordset(${json('coach_reports')}::json) as x(created_at timestamptz, content text)`,
    ]);
  } catch {
    return back('erreur');
  }
  return back('ok');
}
