import { startSession } from '../actions';
import Submit from '@/components/Submit';
import { MUSCLES, today } from '@/lib/config';

export default function NewSession() {
  return (
    <form action={startSession} className="stack">
      <h1>Nouvelle séance</h1>
      <p className="muted">Quels muscles aujourd&apos;hui ?</p>
      <div className="chips">
        {MUSCLES.map((m) => (
          <label key={m} className="chip">
            <input type="checkbox" name="muscle" value={m} /> {m}
          </label>
        ))}
      </div>
      <label className="field">Date <input type="date" name="date" defaultValue={today()} /></label>
      <Submit className="primary" pendingText="…">Commencer</Submit>
    </form>
  );
}
