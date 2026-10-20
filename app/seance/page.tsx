import NewSession from '@/components/NewSession';
import { requireUser } from '@/lib/auth';
import { bestLifts, currentPlan, customExercises, getSettings, lastPerformances, nextPlanDay } from '@/lib/db';

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const user = await requireUser();
  const [plan, last, best, settings, custom] = await Promise.all([
    currentPlan(user.id), lastPerformances(user.id), bestLifts(user.id), getSettings(user.id), customExercises(user.id),
  ]);
  const days = plan?.days ?? [];
  const next = plan ? await nextPlanDay(user.id, plan) : 0;
  const jour = (await searchParams).jour;
  return (
    <NewSession days={days} next={next} auto={jour !== undefined && /^\d+$/.test(jour) ? Number(jour) : null}
      last={last} best={best} rest={Number(settings.rest)} custom={custom} />
  );
}
