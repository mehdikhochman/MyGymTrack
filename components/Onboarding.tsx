'use client';

import { useState } from 'react';
import { completeOnboarding } from '@/app/auth-actions';
import Submit from './Submit';
import { GOALS, LEVELS, SETUPS } from '@/lib/config';

const STEPS = ['Quel est ton objectif ?', 'Ton rythme', 'Ton matériel', 'Ton corps'];
const LEDES = [
  'Le coach s’en sert pour fixer tes séries, tes calories et tes protéines.',
  'Mieux vaut un rythme que tu tiens qu’un rythme parfait.',
  'Le programme n’utilisera que ce que tu as sous la main.',
  'Pour calculer tes besoins. Tout est facultatif et modifiable plus tard.',
];

function Choices({ name, options, initial }: { name: string; options: Record<string, { label: string; detail: string } | string>; initial: string }) {
  return (
    <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
      {Object.entries(options).map(([value, o]) => (
        <label key={value} className="choice">
          <input type="radio" name={name} value={value} defaultChecked={value === initial} />
          <span>{typeof o === 'string' ? <b>{o}</b> : <><b>{o.label}</b><span>{o.detail}</span></>}</span>
        </label>
      ))}
    </fieldset>
  );
}

// Four short steps in one form; the last one saves everything and builds the starter programme.
export default function Onboarding({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  return (
    <form action={completeOnboarding}>
      <div className="steps" role="progressbar" aria-label={`Étape ${step + 1} sur ${STEPS.length}`} aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        {STEPS.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}
      </div>
      {step === 0 && <p className="muted">Bienvenue {name} 👋</p>}
      <h1>{STEPS[step]}</h1>
      <p className="lede">{LEDES[step]}</p>

      <div hidden={step !== 0}><Choices name="goal" options={GOALS} initial="muscle" /></div>

      <div hidden={step !== 1} className="stack">
        <h3>Combien de séances par semaine ?</h3>
        <div className="seg" role="radiogroup" aria-label="Séances par semaine">
          {[2, 3, 4, 5, 6].map((n) => (
            <label key={n}><input type="radio" name="days" value={n} defaultChecked={n === 3} /><span>{n}</span></label>
          ))}
        </div>
        <h3 style={{ marginTop: 16 }}>Ton niveau</h3>
        <Choices name="experience" options={{
          beginner: { label: LEVELS.beginner, detail: 'Moins d’un an de musculation régulière' },
          intermediate: { label: LEVELS.intermediate, detail: '1 à 3 ans, tu connais les mouvements de base' },
          advanced: { label: LEVELS.advanced, detail: 'Plus de 3 ans, tu progresses lentement' },
        }} initial="beginner" />
      </div>

      <div hidden={step !== 2}><Choices name="equipment" options={SETUPS} initial="gym" /></div>

      <div hidden={step !== 3} className="stack">
        <div className="seg" role="radiogroup" aria-label="Sexe">
          <label><input type="radio" name="sex" value="m" defaultChecked /><span className="text">Homme</span></label>
          <label><input type="radio" name="sex" value="f" /><span className="text">Femme</span></label>
        </div>
        <div className="grid2">
          <label className="field">Poids (kg)<input name="weight" inputMode="decimal" placeholder="75" /></label>
          <label className="field">Taille (cm)<input name="height" inputMode="numeric" placeholder="178" /></label>
        </div>
        <label className="field">Année de naissance<input name="birth_year" inputMode="numeric" placeholder="1995" /></label>
      </div>

      <div className="footer-actions">
        {step > 0 && <button type="button" className="back" onClick={() => setStep(step - 1)}>Retour</button>}
        {last ? (
          <Submit className="primary big" pendingText="Création du programme…">Voir mon programme</Submit>
        ) : (
          <button type="button" className="primary big" onClick={() => setStep(step + 1)}>Continuer</button>
        )}
      </div>
    </form>
  );
}
