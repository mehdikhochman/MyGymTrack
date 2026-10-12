'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/config';

type Point = { week: string; avg: number };
const W = 320;
const H = 140;
const PAD = 18;
const TOP = 30;

// Weekly average body weight: one 2px line, first and last values labelled; tap or hover for any week.
export default function WeightChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const values = points.map((p) => p.avg);
  const lo = Math.min(...values) - 0.3;
  const hi = Math.max(...values) + 0.3;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (points.length - 1);
  const y = (v: number) => TOP + (H - TOP - 14) * (1 - (v - lo) / (hi - lo));
  const label = (i: number) => `${points[i].avg.toFixed(1)} kg`;

  function pick(ev: React.PointerEvent<SVGSVGElement>) {
    const box = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - box.left) / box.width) * W;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(((px - PAD) / (W - 2 * PAD)) * (points.length - 1)))));
  }

  const last = points.length - 1;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setActive(null)} role="img" aria-label="Poids moyen par semaine">
        {active !== null && <line x1={x(active)} x2={x(active)} y1={TOP - 6} y2={H - 8} stroke="var(--line)" strokeWidth="1" />}
        <polyline points={points.map((p, i) => `${x(i)},${y(p.avg)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.week} cx={x(i)} cy={y(p.avg)} r={active === i ? 5 : 4} fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
        ))}
        {active === null && (
          <>
            <text x={x(0)} y={y(points[0].avg) - 10} fill="var(--muted)" fontSize="12" textAnchor="start">{label(0)}</text>
            <text x={x(last)} y={y(points[last].avg) - 10} fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="end">{label(last)}</text>
          </>
        )}
      </svg>
      {active !== null && (
        <div className="tip" style={{ left: `${(x(active) / W) * 100}%` }}>Sem. du {formatDate(points[active].week)} · <b>{label(active)}</b></div>
      )}
    </div>
  );
}
