type Props = { label: string; value: number; min: number; max: number; unit?: string; note?: React.ReactNode };

// Progress bar towards a target range [min, max]; turns green once min is reached.
export default function Bar({ label, value, min, max, unit = '', note }: Props) {
  const target = min === max ? `${max}` : `${min}-${max}`;
  return (
    <div className="bar">
      <div className="row">
        <span>{label}{note}</span>
        <span className="muted">{Math.round(value)} / {target}{unit}</span>
      </div>
      <div className="track">
        <div className={value >= min ? 'fill ok' : 'fill'} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}
