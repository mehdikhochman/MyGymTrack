import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import Brand from '@/components/Brand';
import { requestReset, resetPassword } from '../auth-actions';

// Without a token: ask for the reset e-mail. With the token from the e-mail: choose the new password.
export default async function Password({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="auth">
      <Brand />
      {token ? (
        <>
          <h1>Nouveau mot de passe</h1>
          <p className="lede">Choisis un mot de passe d’au moins 8 caractères. Tes autres appareils seront déconnectés.</p>
          <AuthForm action={resetPassword} submit="Enregistrer" pending="Enregistrement…" fields={[
            { name: 'token', label: '', type: 'hidden', value: token },
            { name: 'password', label: 'Nouveau mot de passe', type: 'password', autoComplete: 'new-password' },
          ]} />
        </>
      ) : (
        <>
          <h1>Mot de passe oublié</h1>
          <p className="lede">Indique ton e-mail : tu recevras un lien pour en choisir un nouveau.</p>
          <AuthForm action={requestReset} submit="Envoyer le lien" pending="Envoi…" fields={[
            { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
          ]} />
        </>
      )}
      <p className="center end"><Link href="/login">Retour à la connexion</Link></p>
    </div>
  );
}
