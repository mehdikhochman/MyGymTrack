import Library from '@/components/Library';
import { requireUser } from '@/lib/auth';

export default async function Exercises({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  return (
    <>
      <h1>Exercices</h1>
      <p className="lede">657 exercices avec photos, consignes et muscles travaillés.</p>
      <Library initialQuery={((await searchParams).q ?? '').slice(0, 80)} />
    </>
  );
}
