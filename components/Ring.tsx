// Circular meter towards a daily target: blue while in progress, green with a label once reached.
export default function Ring({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const done = value >= target;
  const left = Math.round(target - value);
  return (
    <div>
      <div className="ring">
        <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden>
          <circle cx="66" cy="66" r={r} fill="none" stroke="var(--accent-soft)" strokeWidth="10" />
          <circle cx="66" cy="66" r={r} fill="none" stroke={done ? 'var(--ok)' : 'var(--accent)'} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(1, value / target))} />
        </svg>
        <div className="center">
          <b>{Math.round(value)}</b>
          <span className="muted small">/ {target} {unit}</span>
        </div>
      </div>
      <p className="small">{label} · {done ? <span className="ok-text">✓ atteint</span> : <span className="muted">reste {left} {unit}</span>}</p>
    </div>
  );
}
