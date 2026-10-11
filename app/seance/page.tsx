import NewSession from '@/components/NewSession';
import { exerciseLists, lastPerformances } from '@/lib/db';

export default async function NewSessionPage() {
  const [exercises, last] = await Promise.all([exerciseLists(), lastPerformances(0)]);
  return <NewSession exercises={exercises} last={last} />;
}
