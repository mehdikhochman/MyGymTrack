'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card stack">
      <h1>Ça n’a pas chargé</h1>
      <p className="muted">La base de données ou le service IA n’a pas répondu. Vérifie ta connexion puis réessaie.</p>
      <button className="primary" onClick={reset}>Réessayer</button>
    </div>
  );
}
