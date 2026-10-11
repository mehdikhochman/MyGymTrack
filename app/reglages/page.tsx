import { logout, saveSettings } from '../actions';
import Submit from '@/components/Submit';
import { MUSCLES } from '@/lib/config';
import { getSettings } from '@/lib/db';

export default async function Settings({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const [settings, { import: imported }] = await Promise.all([getSettings(), searchParams]);
  return (
    <>
      <h1>Réglages</h1>

      <h2>Objectifs</h2>
      <form action={saveSettings} className="card stack">
        <label className="field">Calories / jour <input name="kcal" inputMode="numeric" defaultValue={settings.kcal} /></label>
        <label className="field">Protéines / jour (g) <input name="protein" inputMode="numeric" defaultValue={settings.protein} /></label>
        <p className="muted">Séries par semaine (ex. 12-16 ou 12)</p>
        {MUSCLES.map((m) => (
          <label key={m} className="field">{m} <input name={`sets:${m}`} defaultValue={settings[`sets:${m}`]} /></label>
        ))}
        <Submit className="primary" pendingText="…">Enregistrer</Submit>
      </form>

      <h2>Sauvegarde</h2>
      <div className="card stack">
        <a href="/api/backup" className="button" download>Exporter (JSON)</a>
        <form action="/api/backup" method="post" encType="multipart/form-data" className="stack">
          <input type="file" name="file" accept="application/json,.json" required />
          <Submit confirm="L'import remplace toutes les données actuelles. Continuer ?">Importer</Submit>
        </form>
        {imported === 'ok' && <p className="ok-text">Import réussi.</p>}
        {imported === 'erreur' && <p className="error">Fichier invalide.</p>}
      </div>

      <form action={logout}>
        <Submit>Se déconnecter</Submit>
      </form>
    </>
  );
}
