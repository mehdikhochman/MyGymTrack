'use client';

import { startTransition, useEffect, useOptimistic, useRef, useState } from 'react';
import { addMeal, deleteMeal, saveSettings } from '@/app/actions';
import Icon from './Icon';
import { useInstantList } from './useInstantList';
import { fmt, today } from '@/lib/config';
import { FOODS, forGrams, type Food as FoodItem } from '@/lib/foods';
import { normalize } from '@/lib/exercises';

export type Meal = { id: number; name: string | null; calories: number; protein_g: number; carbs_g: number; fat_g: number };
type Row = Omit<Meal, 'id'>;
type Energy = { intake: number; kgPerWeek: number; tdee: number } | null;
type Targets = { kcal: number; protein: number; carbs: number; fat: number };
type Props = { meals: Meal[]; targets: Targets; frequent: (Row & { name: string })[]; energy: Energy; goal: string };

// Weekly weight change aimed for by goal, as a daily kcal offset (7700 kcal per kg).
const OFFSET: Record<string, [number, string]> = {
  muscle: [275, '+0,25 kg/sem'], strength: [200, '+0,2 kg/sem'], fat: [-500, '−0,45 kg/sem'], fit: [0, 'poids stable'],
};
const parse = (v: FormDataEntryValue | null) => Number(String(v ?? '').replace(',', '.') || '0');
const MACROS = [['protein_g', 'Protéines', 4, 'var(--green)'], ['carbs_g', 'Glucides', 4, 'var(--gold)'], ['fat_g', 'Lipides', 9, '#8E5BD8']] as const;

// Products from Open Food Facts (searched from the browser; values per 100 g).
async function searchOff(q: string, signal: AbortSignal): Promise<FoodItem[]> {
  const fields = 'product_name,brands,nutriments,serving_quantity';
  const url = /^\d{8,14}$/.test(q)
    ? `https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=${fields}`
    : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=12&lc=fr&fields=${fields}`;
  const data = await (await fetch(url, { signal })).json();
  const products = data.product ? [data.product] : (data.products ?? []);
  return products
    .filter((p: { product_name?: string; nutriments?: Record<string, number> }) => p.product_name && p.nutriments?.['energy-kcal_100g'] !== undefined)
    .map((p: { product_name: string; brands?: string; nutriments: Record<string, number>; serving_quantity?: number }) => ({
      name: `${p.product_name}${p.brands ? ` (${p.brands.split(',')[0]})` : ''}`.slice(0, 70),
      kcal: Math.round(p.nutriments['energy-kcal_100g']),
      protein: p.nutriments.proteins_100g ?? 0,
      carbs: p.nutriments.carbohydrates_100g ?? 0,
      fat: p.nutriments.fat_100g ?? 0,
      portion: 'portion', grams: Number(p.serving_quantity) || 100,
    }));
}

function FoodSearch({ onAdd }: { onAdd: (row: Row & { name: string }) => void }) {
  const [q, setQ] = useState('');
  const [off, setOff] = useState<FoodItem[]>([]);
  const [status, setStatus] = useState<'' | 'loading' | 'error'>('');
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState('');

  const query = q.trim();
  const local = query.length < 2 ? [] : FOODS.filter((f) => normalize(f.name).includes(normalize(query))).slice(0, 8);

  useEffect(() => {
    if (query.length < 3) return setOff([]);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setStatus('loading');
      searchOff(query, ctrl.signal).then((r) => { setOff(r); setStatus(''); }, (e) => e.name !== 'AbortError' && setStatus('error'));
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  function choose(f: FoodItem) {
    setPicked(f);
    setGrams(String(f.grams));
  }
  function add() {
    const g = Number(grams.replace(',', '.'));
    if (!picked || !(g > 0 && g < 5000)) return;
    onAdd({ name: `${picked.name} (${g} g)`.slice(0, 80), ...forGrams(picked, g) });
    setPicked(null);
    setQ('');
  }
  const n = picked && forGrams(picked, Number(grams.replace(',', '.')) || 0);

  return (
    <div className="card">
      <div className="search">
        <Icon name="search" size={20} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} placeholder="Aliment, produit ou code-barres" aria-label="Rechercher un aliment" style={{ background: 'var(--surface-2)' }} />
      </div>
      {picked && n ? (
        <div style={{ marginTop: 12 }}>
          <b>{picked.name}</b>
          <p className="muted small">{picked.kcal} kcal · P {picked.protein} g · G {picked.carbs} g · L {picked.fat} g pour 100 g</p>
          <div className="portion">
            <label className="field">Quantité (g){picked.portion !== 'portion' && <span className="muted tiny">{picked.portion} ≈ {picked.grams} g</span>}
              <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} autoFocus />
            </label>
            <div className="num" style={{ fontSize: 28, alignSelf: 'end', paddingBottom: 8 }}>{n.calories} kcal</div>
          </div>
          <p className="muted small">P {n.protein_g} g · G {n.carbs_g} g · L {n.fat_g} g</p>
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="soft" onClick={() => setPicked(null)}>Annuler</button>
            <button className="primary" onClick={add}>Ajouter</button>
          </div>
        </div>
      ) : (
        (local.length > 0 || off.length > 0 || status) && (
          <div className="list" style={{ margin: '8px -16px -8px' }}>
            {[...local, ...off].map((f, i) => (
              <button key={`${f.name}-${i}`} className="item tap" onClick={() => choose(f)}>
                <span className="grow"><b className="ellipsis" style={{ display: 'block' }}>{f.name}</b><span className="muted small">{f.kcal} kcal · {f.protein} g prot. / 100 g</span></span>
                <Icon name="plus" />
              </button>
            ))}
            {status === 'loading' && <p className="muted small" style={{ padding: '8px 16px' }}>Recherche dans Open Food Facts…</p>}
            {status === 'error' && <p className="muted small" style={{ padding: '8px 16px' }}>Open Food Facts ne répond pas. Les aliments courants restent disponibles.</p>}
          </div>
        )
      )}
    </div>
  );
}

// Today's meals and totals; every change shows before the server answers.
export default function Food({ meals, targets, frequent, energy, goal }: Props) {
  const { list, add: addRow, remove } = useInstantList(meals);
  const [kcalTarget, setKcalTarget] = useOptimistic(targets.kcal);
  const form = useRef<HTMLFormElement>(null);
  const [offset, aim] = OFFSET[goal] ?? OFFSET.fit;
  const suggested = energy && Math.round((energy.tdee + offset) / 50) * 50;

  function log(row: Row & { name: string | null }, date = today()) {
    const fd = new FormData();
    fd.set('name', row.name ?? '');
    fd.set('calories', String(row.calories));
    fd.set('protein', String(row.protein_g));
    fd.set('carbs', String(row.carbs_g));
    fd.set('fat', String(row.fat_g));
    fd.set('date', date);
    startTransition(async () => {
      try {
        await addRow(date === today() ? row : null, () => addMeal(fd));
      } catch {
        alert("Le repas n'a pas pu être enregistré.");
      }
    });
  }

  function manual(fd: FormData) {
    const row = { name: String(fd.get('name') ?? '').trim() || null, calories: Math.round(parse(fd.get('calories'))), protein_g: parse(fd.get('protein')), carbs_g: parse(fd.get('carbs')), fat_g: parse(fd.get('fat')) };
    if (![row.calories, row.protein_g, row.carbs_g, row.fat_g].every((v) => v >= 0)) return alert('Valeur invalide.');
    form.current?.reset();
    log(row, String(fd.get('date') || today()));
  }

  function applyTarget(value: number) {
    const fd = new FormData();
    fd.set('kcal', String(value));
    startTransition(async () => {
      setKcalTarget(value);
      await saveSettings(fd);
    });
  }

  const total = (k: keyof Row) => list.reduce((t, m) => t + Number(m[k] ?? 0), 0);
  const eaten = total('calories');
  const left = kcalTarget - eaten;
  const macroKcal = MACROS.map(([k, , f]) => total(k) * f);
  const macroSum = macroKcal.reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      <div className="card">
        <div className="hero-num">{fmt(Math.abs(left))}<small>{left >= 0 ? 'kcal à manger' : 'kcal au-dessus'}</small></div>
        <p className="muted small">{fmt(eaten)} mangées sur {fmt(kcalTarget)} kcal</p>
        <div className="segbar" aria-hidden>
          {MACROS.map(([k, , , color], i) => <span key={k} style={{ width: `${(macroKcal[i] / macroSum) * Math.min(100, (eaten / kcalTarget) * 100)}%`, background: color }} />)}
        </div>
        {MACROS.map(([k, label, , color]) => {
          const target = targets[k === 'protein_g' ? 'protein' : k === 'carbs_g' ? 'carbs' : 'fat'];
          const v = total(k);
          return (
            <div key={k} className="meter">
              <div className="row small"><span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: color, marginRight: 6 }} />{label}</span>
                <span className="muted"><b className="num" style={{ color: 'var(--ink)', fontSize: 17 }}>{Math.round(v)}</b> / {target} g</span></div>
              <div className="track"><div className="fill" style={{ width: `${Math.min(100, (v / (target || 1)) * 100)}%`, background: color }} /></div>
            </div>
          );
        })}
      </div>

      <h2>Ajouter</h2>
      <FoodSearch onAdd={(row) => log(row)} />

      {frequent.length > 0 && (
        <div className="chips scroll" style={{ marginBottom: 12 }}>
          {frequent.map((m) => (
            <button key={`${m.name}-${m.calories}`} className="chip" onClick={() => log(m)}>+ {m.name} · {m.calories}</button>
          ))}
        </div>
      )}

      <details className="card">
        <summary><b>Saisie manuelle</b> <span className="muted small">(étiquette, restaurant…)</span></summary>
        <form ref={form} action={manual} className="stack" style={{ marginTop: 12 }}>
          <input name="name" placeholder="Nom (facultatif)" maxLength={80} />
          <div className="grid2">
            <input name="calories" inputMode="numeric" placeholder="kcal" required />
            <input name="protein" inputMode="decimal" placeholder="Protéines (g)" />
            <input name="carbs" inputMode="decimal" placeholder="Glucides (g)" />
            <input name="fat" inputMode="decimal" placeholder="Lipides (g)" />
          </div>
          <input type="date" name="date" defaultValue={today()} aria-label="Date" />
          <button className="primary">Ajouter le repas</button>
        </form>
      </details>

      {list.length > 0 && (
        <>
          <h2>Aujourd’hui</h2>
          <div className="card flush list">
            {list.map((m) => (
              <div key={m.id} className="item">
                <span className="grow"><span className="ellipsis" style={{ display: 'block' }}>{m.name || 'Repas'}</span><span className="muted small">P {Math.round(m.protein_g)} · G {Math.round(m.carbs_g ?? 0)} · L {Math.round(m.fat_g ?? 0)}</span></span>
                <b className="num" style={{ fontSize: 20 }}>{m.calories}</b>
                <button className="icon-btn" onClick={() => remove(m.id, deleteMeal, "Le repas n'a pas pu être supprimé.")} aria-label={`Supprimer ${m.name || 'le repas'}`}><Icon name="x" size={18} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {energy && suggested && (
        <>
          <h2>Dépense réelle</h2>
          <div className="card">
            <p className="muted small">Calculée sur tes 3 dernières semaines (apports et poids)</p>
            <p className="hero-num" style={{ fontSize: 44 }}>{fmt(energy.tdee)}<small>kcal/jour</small></p>
            <p className="muted small">Poids {energy.kgPerWeek >= 0 ? '+' : ''}{energy.kgPerWeek.toFixed(2).replace(".", ",")} kg/sem · apports moyens {fmt(energy.intake)} kcal</p>
            <div className="divider" />
            <div className="row">
              <div><p className="muted small">Objectif conseillé ({aim})</p><p><b>{fmt(suggested)} kcal/jour</b></p></div>
              {suggested !== kcalTarget ? (
                <button className="primary" style={{ width: 'auto' }} onClick={() => applyTarget(suggested)}>Appliquer</button>
              ) : (
                <span className="ok small">✓ Appliqué</span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
