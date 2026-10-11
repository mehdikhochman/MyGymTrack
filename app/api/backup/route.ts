import { sql, TABLES } from '@/lib/db';
import { today } from '@/lib/config';

// Export: every table as JSON, serialized by Postgres so that import restores identical values.
export async function GET() {
  const data: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const t of TABLES) {
    const [r] = await sql.query(`select coalesce(json_agg(t order by ${t === 'settings' ? 'key' : 'id'}), '[]') as rows from ${t} t`);
    data[t] = r.rows;
  }
  return new Response(JSON.stringify(data, null, 1), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="mygymtrack-${today()}.json"`,
    },
  });
}

// Import: replaces all data with the uploaded export, in one transaction.
export async function POST(req: Request) {
  const file = (await req.formData()).get('file');
  const back = (status: string) => Response.redirect(new URL(`/reglages?import=${status}`, req.url), 303);
  let data: Record<string, unknown[]>;
  try {
    data = JSON.parse(await (file as File).text());
    if (!TABLES.every((t) => Array.isArray(data[t]))) throw new Error();
  } catch {
    return back('erreur');
  }
  await sql.transaction([
    sql.query(`truncate ${TABLES.join(', ')} restart identity`),
    ...TABLES.map((t) => sql.query(`insert into ${t} select * from json_populate_recordset(null::${t}, $1::json)`, [JSON.stringify(data[t])])),
    ...TABLES.filter((t) => t !== 'settings').map((t) =>
      sql.query(`select setval(pg_get_serial_sequence('${t}', 'id'), coalesce(max(id), 0) + 1, false) from ${t}`)),
  ]);
  return back('ok');
}
