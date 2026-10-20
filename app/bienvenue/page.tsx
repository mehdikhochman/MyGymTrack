import { redirect } from 'next/navigation';
import Onboarding from '@/components/Onboarding';
import { requireUser } from '@/lib/auth';

export default async function Welcome() {
  const user = await requireUser({ onboarding: true });
  if (user.onboarded) redirect('/');
  return <Onboarding name={user.name} />;
}
