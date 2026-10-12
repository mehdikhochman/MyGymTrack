'use client';

import { useEffect, useState } from 'react';

let audio: AudioContext | undefined;
// Browsers (iOS especially) only allow sound after a tap: call this from the tap that starts the timer.
export const unlockSound = () => {
  audio ??= new AudioContext();
  audio.resume();
};

function beep() {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.6);
}

// Rest countdown shown after each set; beeps and vibrates when it is time for the next one.
export default function RestTimer({ end, setEnd }: { end: number | null; setEnd: (end: number | null) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!end) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [end]);

  const left = end ? Math.ceil((end - now) / 1000) : 0;
  const finished = end !== null && left <= 0;
  useEffect(() => {
    if (!finished) return;
    beep();
    navigator.vibrate?.(300);
    setEnd(null);
  }, [finished, setEnd]);

  if (!end || finished) return null;
  return (
    <div className="rest">
      <span>Repos <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b></span>
      <button onClick={() => setEnd(end - 15_000)}>−15 s</button>
      <button onClick={() => setEnd(end + 15_000)}>+15 s</button>
      <button onClick={() => setEnd(null)} aria-label="Arrêter">✕</button>
    </div>
  );
}
