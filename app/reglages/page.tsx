import Submit from '@/components/Submit';
import { DeleteAccount, PasswordForm, ProfileForm, PushToggle, TargetsForm } from '@/components/Settings';
import { logout } from '../actions';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/db';

export default async function Settings({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const user = await requireUser();
  const [settings, { import: imported }] = await Promise.all([getSettings(user.id), searchParams]);
  return (
    <>
      <h1>Réglages</h1>
      <p className="lede">{user.email}</p>

      <h2>Profil</h2>
      <ProfileForm user={user} split={settings.split ?? 'keep'} />

      <h2>Objectifs</h2>
      <TargetsForm settings={settings} />

      <h2>Rappel</h2>
      <div className="card stack">
        <p className="small">Un rappel vers 19 h si tu n’as rien noté de la journée, pour ne pas perdre ta série.</p>
        <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
      </div>

      <h2>Mes données</h2>
      <div className="card stack">
        <a href="/api/backup" className="button soft" download>Exporter mes données (JSON)</a>
        <form action="/api/backup" method="post" encType="multipart/form-data" className="stack">
          <input type="file" name="file" accept="application/json,.json" required aria-label="Fichier de sauvegarde" />
          <Submit className="soft" confirm="L’import remplace toutes tes données actuelles. Continuer ?">Importer une sauvegarde</Submit>
        </form>
        {imported === 'ok' && <p className="ok">Import réussi.</p>}
        {imported === 'erreur' && <p className="error">Fichier invalide : choisis un export MyGymTrack (.json).</p>}
      </div>

      <h2>Compte</h2>
      <form action={logout} style={{ marginBottom: 12 }}>
        <Submit pendingText="Déconnexion…">Se déconnecter</Submit>
      </form>
      <PasswordForm />
      <DeleteAccount />

      <p className="muted tiny center end">
        Logo : « Weight lifting up » par Delapouite, <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">game-icons.net</a>, licence{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>.
        Exercices : free-exercise-db (domaine public).
      </p>
    </>
  );
}
