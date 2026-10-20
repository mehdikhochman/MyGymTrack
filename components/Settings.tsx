'use client';

import { useActionState, useEffect, useState } from 'react';
import { changePassword, deleteAccount, deletePush, savePush, saveProfile, saveSettings } from '@/app/actions';
import Submit from './Submit';
import { GOALS, LEVELS, SETUPS } from '@/lib/config';
import type { User } from '@/lib/auth';

// Saving shows "Enregistré" next to the button for a moment.
function useSaved(action: (fd: FormData) => Promise<void>) {
  return useActionState(async (_: boolean, fd: FormData) => { await action(fd); return true; }, false);
}

export function ProfileForm({ user }: { user: User }) {
  const [saved, run] = useSaved(saveProfile);
  return (
    <form action={run} className="card stack">
      <label className="field">Prénom<input name="name" defaultValue={user.name} maxLength={40} /></label>
      <label className="field">Objectif
        <select name="goal" defaultValue={user.goal}>{Object.entries(GOALS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select>
      </label>
      <div className="grid2">
        <label className="field">Séances / semaine
          <select name="days" defaultValue={user.days_per_week}>{[2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label className="field">Niveau
          <select name="experience" defaultValue={user.experience}>{Object.entries(LEVELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
      </div>
      <label className="field">Matériel
        <select name="equipment" defaultValue={user.equipment}>{Object.entries(SETUPS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
      </label>
      <div className="grid3">
        <label className="field">Sexe
          <select name="sex" defaultValue={user.sex ?? ''}><option value="">—</option><option value="m">Homme</option><option value="f">Femme</option></select>
        </label>
        <label className="field">Taille (cm)<input name="height" inputMode="numeric" defaultValue={user.height_cm ?? ''} /></label>
        <label className="field">Né(e) en<input name="birth_year" inputMode="numeric" defaultValue={user.birth_year ?? ''} /></label>
      </div>
      <label className="row small" style={{ justifyContent: 'flex-start' }}>
        <input type="checkbox" name="targets" style={{ width: 22, minHeight: 22 }} /> Recalculer mes objectifs nutrition
      </label>
      <Submit className="primary" pendingText="Enregistrement…">{saved ? 'Enregistré ✓' : 'Enregistrer le profil'}</Submit>
      <p className="muted tiny">Le programme ne change pas tout seul : demande au coach de l’adapter après un changement.</p>
    </form>
  );
}

export function TargetsForm({ settings }: { settings: Record<string, string> }) {
  const [saved, run] = useSaved(saveSettings);
  const field = (key: string, label: string) => (
    <label className="field">{label}<input name={key} inputMode="numeric" defaultValue={settings[key]} pattern="\d{1,5}" /></label>
  );
  return (
    <form action={run} className="card stack">
      <div className="grid2">
        {field('kcal', 'Calories (kcal)')}
        {field('protein', 'Protéines (g)')}
        {field('carbs', 'Glucides (g)')}
        {field('fat', 'Lipides (g)')}
      </div>
      {field('rest', 'Repos par défaut entre les séries (s)')}
      <Submit className="primary" pendingText="Enregistrement…">{saved ? 'Enregistré ✓' : 'Enregistrer les objectifs'}</Submit>
    </form>
  );
}

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

// Daily streak reminder by web push (on iPhone: only once the app is added to the home screen).
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<'unsupported' | 'off' | 'on' | 'busy' | 'denied'>('busy');
  useEffect(() => {
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return setState('unsupported');
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(Notification.permission === 'denied' ? 'denied' : sub ? 'on' : 'off'), () => setState('unsupported'));
  }, [publicKey]);

  async function toggle() {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePush(sub.endpoint);
        await sub.unsubscribe();
        return setState('off');
      }
      const created = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey!) });
      await savePush(created.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setState('on');
    } catch {
      setState(Notification.permission === 'denied' ? 'denied' : 'off');
    }
  }

  if (state === 'unsupported') {
    return <p className="muted small">Rappels indisponibles ici. Sur iPhone : ajoute l’app à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvre-la depuis l’icône.</p>;
  }
  if (state === 'denied') return <p className="muted small">Notifications bloquées : autorise-les dans les réglages du téléphone.</p>;
  return (
    <button className={state === 'on' ? 'soft' : 'primary'} disabled={state === 'busy'} onClick={toggle}>
      {state === 'on' ? 'Désactiver le rappel du soir' : 'Activer le rappel du soir'}
    </button>
  );
}

export function DeleteAccount() {
  const [error, run] = useActionState(deleteAccount, undefined);
  return (
    <details className="card">
      <summary className="danger" style={{ fontWeight: 700 }}>Supprimer mon compte</summary>
      <form action={run} className="stack" style={{ marginTop: 12 }}>
        <p className="muted small">Toutes tes données (séances, repas, pesées, programmes) sont effacées définitivement. Exporte-les d’abord si tu veux les garder.</p>
        <input type="password" name="password" placeholder="Mot de passe" autoComplete="current-password" required aria-label="Mot de passe" />
        {error && <p className="error">{error}</p>}
        <Submit className="danger" confirm="Supprimer définitivement ton compte et toutes tes données ?" pendingText="Suppression…">Supprimer définitivement</Submit>
      </form>
    </details>
  );
}

export function PasswordForm() {
  const [message, run] = useActionState(changePassword, undefined);
  return (
    <details className="card">
      <summary style={{ fontWeight: 700 }}>Changer de mot de passe</summary>
      <form action={run} className="stack" style={{ marginTop: 12 }}>
        <input type="password" name="current" placeholder="Mot de passe actuel" autoComplete="current-password" required aria-label="Mot de passe actuel" />
        <input type="password" name="next" placeholder="Nouveau mot de passe (8 caractères min.)" autoComplete="new-password" minLength={8} required aria-label="Nouveau mot de passe" />
        {message && <p className={message === 'Mot de passe modifié.' ? 'ok' : 'error'} role="alert">{message}</p>}
        <Submit className="primary" pendingText="Enregistrement…">Changer le mot de passe</Submit>
        <p className="muted tiny">Tes autres appareils seront déconnectés.</p>
      </form>
    </details>
  );
}
