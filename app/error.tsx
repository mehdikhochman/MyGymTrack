'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card stack">
      <h1>Oups</h1>
      <p>Une erreur est survenue (base de données ou service IA indisponible ?).</p>
      <button className="primary" onClick={reset}>Réessayer</button>
    </div>
  );
}
