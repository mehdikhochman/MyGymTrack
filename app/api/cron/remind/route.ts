import webpush from 'web-push';
import { sql } from '@/lib/db';
import { today } from '@/lib/config';
import { computeStreak } from '@/lib/streak';

export const maxDuration = 300;

// Called daily by Vercel Cron (see vercel.json): reminds users who logged nothing today that their streak is at stake.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv } = process.env;
  if (!pub || !priv) return Response.json({ sent: 0, reason: 'VAPID keys missing' });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);

  // Subscribed users with no log today, with their recent active days.
  const rows = await sql`
    select p.endpoint, p.p256dh, p.auth, u.name,
      coalesce((select array_agg(d::text) from (
        select se.date as d from sessions se where se.user_id = u.id and se.date > current_date - 60 and exists (select 1 from sets s where s.session_id = se.id)
        union select date from meals where user_id = u.id and date > current_date - 60
        union select date from body_weight where user_id = u.id and date > current_date - 60) a), '{}') as active
    from push_subscriptions p join users u on u.id = p.user_id`;
  let sent = 0;
  for (const r of rows) {
    const streak = computeStreak(r.active, today());
    if (streak.doneToday) continue;
    const body = streak.current > 0
      ? `Ta série de ${streak.current} jour${streak.current > 1 ? 's' : ''} s’arrête à minuit. Note un repas ou une séance pour la garder.`
      : 'Une séance, un repas noté : c’est le premier jour d’une nouvelle série.';
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        JSON.stringify({ title: streak.current > 0 ? `🔥 ${streak.current} jours, ${r.name}` : `C’est parti, ${r.name}`, body, url: '/' }));
      sent++;
    } catch (e) {
      // Expired subscription: forget it.
      if ((e as { statusCode?: number }).statusCode === 404 || (e as { statusCode?: number }).statusCode === 410) {
        await sql`delete from push_subscriptions where endpoint = ${r.endpoint}`;
      }
    }
  }
  return Response.json({ sent });
}
