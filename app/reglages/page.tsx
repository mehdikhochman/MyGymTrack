import Link from 'next/link';
import SettingsForm from '@/components/SettingsForm';
import Submit from '@/components/Submit';
import { getSettings } from '@/lib/db';

export default async function Settings({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const [settings, { import: imported }] = await Promise.all([getSettings(), searchParams]);
  return (
    <>
      <h1>Réglages</h1>

      <h2>Objectifs</h2>
      <SettingsForm settings={settings} />

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

      <Link href="/login" className="button">Se déconnecter</Link>
    </>
  );
}
