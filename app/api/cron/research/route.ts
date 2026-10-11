import { sql } from '@/lib/db';
import { research } from '@/lib/ai';

export const maxDuration = 300; // Hobby plan maximum

// Called weekly by Vercel Cron (see vercel.json) with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const known = (await sql`select source_url from research_notes order by id`).map((r) => r.source_url as string);
  const { notes, tokens, searches } = await research(known);
  let saved = 0;
  for (const n of notes) {
    const rows = await sql`
      insert into research_notes (title, summary, source_url) values (${n.title}, ${n.summary}, ${n.source_url})
      on conflict (source_url) do nothing returning id`;
    saved += rows.length;
  }
  return Response.json({ saved, tokens, searches });
}
