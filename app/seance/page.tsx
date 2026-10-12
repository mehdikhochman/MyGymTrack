import NewSession from '@/components/NewSession';
import { bestLifts, exerciseLists, getSettings, lastPerformances } from '@/lib/db';

export default async function NewSessionPage() {
  const [exercises, last, best, settings] = await Promise.all([exerciseLists(), lastPerformances(0), bestLifts(0), getSettings()]);
  return <NewSession exercises={exercises} last={last} best={best} rest={Number(settings.rest)} />;
}
