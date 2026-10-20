import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import Brand from '@/components/Brand';
import { signup } from '../auth-actions';
import { currentUser } from '@/lib/auth';

export default async function Signup() {
  if (await currentUser()) redirect('/');
  return (
    <div className="auth">
      <Brand />
      <h1>Créer un compte</h1>
      <p className="lede">Note tes séances et tes repas, le coach IA te dit quoi faire ensuite.</p>
      <AuthForm action={signup} submit="Créer mon compte" pending="Création…" fields={[
        { name: 'name', label: 'Prénom', autoComplete: 'given-name' },
        { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Mot de passe (8 caractères minimum)', type: 'password', autoComplete: 'new-password' },
      ]} />
      <p className="center muted end">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
      <p className="center muted tiny">Tes données servent uniquement à ton suivi. Tu peux les exporter ou supprimer ton compte à tout moment dans les réglages.</p>
    </div>
  );
}
