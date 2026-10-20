'use client';

import { useRef } from 'react';
import { addWeight, deleteWeight } from '@/app/actions';
import Icon from './Icon';
import WeightChart from './WeightChart';
import { useInstantList } from './useInstantList';
import { formatDate, today } from '@/lib/config';

export type Weight = { id: number; date: string; weight_kg: number };
type Week = { week: string; avg: number };

// Body weight: latest value, weekly trend, quick entry; changes show before the server answers.
export default function Weights({ weights, trend }: { weights: Weight[]; trend: Week[] }) {
  const { list, add: addRow, remove } = useInstantList(weights);
  const latest = [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const change = trend.length > 1 ? trend[trend.length - 1].avg - trend[0].avg : null;
  const form = useRef<HTMLFormElement>(null);

  async function add(fd: FormData) {
    const weight_kg = Number(String(fd.get('weight')).replace(',', '.'));
    if (!(weight_kg > 0)) return alert('Poids invalide.');
    form.current?.reset();
    try {
      await addRow({ date: String(fd.get('date') || today()), weight_kg }, () => addWeight(fd));
    } catch {
      alert("La pesée n'a pas pu être enregistrée.");
    }
  }

  return (
    <>
      <div className="card">
        <p className="muted small">Dernière pesée{latest[0] && ` · ${formatDate(latest[0].date)}`}</p>
        <p className="hero-num" style={{ fontSize: 44 }}>{latest[0] ? latest[0].weight_kg : '—'}<small>kg</small></p>
        {change !== null && (
          <p className="small">
            <span className="num" style={{ fontSize: 17 }}>{change >= 0 ? '+' : ''}{change.toFixed(1).replace(".", ",")} kg</span>
            <span className="muted"> en {trend.length} semaines (moyennes hebdo)</span>
          </p>
        )}
        {trend.length > 1 && <WeightChart points={trend} />}
        {trend.length > 1 && (
          <details className="small">
            <summary className="muted">Voir le tableau</summary>
            {trend.map((w) => (
              <div key={w.week} className="row small"><span className="muted">Sem. du {formatDate(w.week)}</span><span className="num">{w.avg.toFixed(1).replace(".", ",")} kg</span></div>
            ))}
          </details>
        )}
      </div>

      <form ref={form} action={add} className="card stack">
        <div className="grid2">
          <input name="weight" inputMode="decimal" placeholder="Poids (kg)" required aria-label="Poids (kg)" />
          <input type="date" name="date" defaultValue={today()} aria-label="Date" />
        </div>
        <button className="primary">Enregistrer la pesée</button>
      </form>

      {latest.length > 0 && (
        <div className="card flush list">
          {latest.map((w) => (
            <div key={w.id} className="item">
              <span className="grow">{formatDate(w.date)}</span>
              <b className="num" style={{ fontSize: 18 }}>{w.weight_kg} kg</b>
              <button className="icon-btn" onClick={() => remove(w.id, deleteWeight, "La pesée n'a pas pu être supprimée.")} aria-label={`Supprimer la pesée du ${formatDate(w.date)}`}><Icon name="x" size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
