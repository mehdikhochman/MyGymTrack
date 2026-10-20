// Daily targets from the profile (Mifflin-St Jeor), adjusted to the goal. The user can override them in settings.
export function nutritionTargets(p: { sex: string | null; birth_year: number | null; height_cm: number | null; goal: string; days_per_week: number }, weight: number, year = new Date().getFullYear()) {
  const age = p.birth_year ? year - p.birth_year : 30;
  const height = p.height_cm ?? (p.sex === 'f' ? 165 : 178);
  const bmr = 10 * weight + 6.25 * height - 5 * age + (p.sex === 'f' ? -161 : 5);
  const activity = 1.3 + 0.05 * Math.min(6, p.days_per_week); // light daily life + training sessions
  const factor = { muscle: 1.1, fat: 0.8, strength: 1.05, fit: 1 }[p.goal] ?? 1;
  const kcal = Math.round((bmr * activity * factor) / 50) * 50;
  const protein = Math.round(weight * ({ muscle: 2, fat: 2.2, strength: 1.8, fit: 1.6 }[p.goal] ?? 1.8));
  const fat = Math.round(weight * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

// Calories from macros (Atwater factors).
export const kcalOf = (p: number, c: number, f: number) => Math.round(p * 4 + c * 4 + f * 9);
