'use client';

import { useActionState } from 'react';
import { login } from '../actions';
import Submit from '@/components/Submit';

export default function Login() {
  const [error, action] = useActionState(login, undefined);
  return (
    <form action={action} className="card stack login">
      <h1>MyGymTrack</h1>
      <input type="password" name="password" placeholder="Mot de passe" autoComplete="current-password" required autoFocus />
      {error && <p className="error">{error}</p>}
      <Submit className="primary" pendingText="…">Entrer</Submit>
    </form>
  );
}
