'use client';

import { useState } from 'react';
import { celebrated } from '@/app/actions';
import { Flame } from './Icon';

const TEXT: Record<number, string> = {
  3: 'Trois jours de suite : l’habitude démarre.',
  7: 'Une semaine complète. Tu gagnes un joker : il sauve ta série si tu oublies un jour.',
  14: 'Deux semaines sans lâcher. Les résultats arrivent maintenant.',
  30: 'Un mois sans lâcher. Ton corps a déjà changé.',
};

// Full-screen moment when the streak reaches a milestone (shown once per milestone).
export default function Celebration({ days, freezes, workouts }: { days: number; freezes: number; workouts: number }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  async function share() {
    const text = `🔥 ${days} jours d’affilée sur MyGymTrack !`;
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else await navigator.clipboard?.writeText(text);
  }
  return (
    <div className="celebrate" role="dialog" aria-label={`Série de ${days} jours`}>
      <div className="flame-big"><Flame size={168} /></div>
      <div className="n">{days}</div>
      <div className="unit">jours d’affilée</div>
      <p>{TEXT[days] ?? 'Tu tiens le rythme. Chaque jour noté compte.'}</p>
      <div className="row" style={{ gap: 10, marginTop: 28 }}>
        <div className="card" style={{ background: 'var(--dark-2)', margin: 0, textAlign: 'left' }}><div className="muted small" style={{ color: 'var(--on-dark)' }}>Séances</div><div className="num" style={{ fontSize: 26 }}>{workouts}</div></div>
        <div className="card" style={{ background: 'var(--dark-2)', margin: 0, textAlign: 'left' }}><div className="muted small" style={{ color: 'var(--on-dark)' }}>Jokers</div><div className="num" style={{ fontSize: 26 }}>{freezes}</div></div>
      </div>
      <div className="actions">
        <button className="primary big" onClick={() => { setOpen(false); celebrated(days); }}>Continuer</button>
        <button className="ghost" onClick={share}>Partager ma série</button>
      </div>
    </div>
  );
}
