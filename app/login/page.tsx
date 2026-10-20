import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import Brand from '@/components/Brand';
import { login } from '../auth-actions';
import { currentUser } from '@/lib/auth';

export default async function Login() {
  if (await currentUser()) redirect('/');
  return (
    <div className="auth">
      <Brand />
      <h1>Connexion</h1>
      <p className="lede">Content de te revoir. Ta série t’attend.</p>
      <AuthForm action={login} submit="Se connecter" pending="Connexion…" fields={[
        { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Mot de passe', type: 'password', autoComplete: 'current-password' },
      ]} />
      <p className="center end"><Link href="/mot-de-passe">Mot de passe oublié ?</Link></p>
      <p className="center muted">Pas encore de compte ? <Link href="/inscription">Créer un compte</Link></p>
    </div>
  );
}
