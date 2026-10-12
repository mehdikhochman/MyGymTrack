import Link from 'next/link';
import SettingsForm from '@/components/SettingsForm';
import Submit from '@/components/Submit';
import { getSettings } from '@/lib/db';

export default async function Settings({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const [settings, { import: imported }] = await Promise.all([getSettings(), searchParams]);
  return (
    <>
      <h1>Réglages</h1>
      <p className="subtitle">Objectifs, sauvegarde et compte</p>
      <SettingsForm settings={settings} />

      <h2>Sauvegarde</h2>
      <div className="card stack">
        <a href="/api/backup" className="button" download>Exporter mes données (JSON)</a>
        <form action="/api/backup" method="post" encType="multipart/form-data" className="stack">
          <input type="file" name="file" accept="application/json,.json" required />
          <Submit confirm="L'import remplace toutes les données actuelles. Continuer ?">Importer une sauvegarde</Submit>
        </form>
        {imported === 'ok' && <p className="ok-text">Import réussi.</p>}
        {imported === 'erreur' && <p className="error">Fichier invalide.</p>}
      </div>

      <h2>Compte</h2>
      <Link href="/login" className="button danger">Se déconnecter</Link>
    </>
  );
}
