'use client';

import { useActionState, useEffect } from 'react';
import { login, logout } from '../actions';
import Icon from '@/components/Icon';
import Submit from '@/components/Submit';

export default function Login() {
  const [error, action] = useActionState(login, undefined);
  useEffect(() => { logout(); }, []); // opening this page signs out, so "Se déconnecter" is a plain link
  return (
    <form action={action} className="stack login">
      <div className="logo"><Icon name="dumbbell" size={34} /></div>
      <h1>MyGymTrack</h1>
      <p className="subtitle">Muscu · nutrition · coach IA</p>
      <input type="password" name="password" placeholder="Mot de passe" autoComplete="current-password" required autoFocus />
      {error && <p className="error">{error}</p>}
      <Submit className="primary hero-cta" pendingText="…">Entrer</Submit>
    </form>
  );
}
