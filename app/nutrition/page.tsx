import Food, { type Meal } from '@/components/Food';
import { requireUser } from '@/lib/auth';
import { today } from '@/lib/config';
import { expenditure, frequentMeals, getSettings, sql } from '@/lib/db';

export default async function Nutrition() {
  const user = await requireUser();
  const [meals, settings, frequent, energy] = await Promise.all([
    sql`select id, name, calories, protein_g, carbs_g, fat_g from meals where user_id = ${user.id} and date = ${today()} order by id`,
    getSettings(user.id),
    frequentMeals(user.id),
    expenditure(user.id),
  ]);
  const targets = { kcal: Number(settings.kcal), protein: Number(settings.protein), carbs: Number(settings.carbs), fat: Number(settings.fat) };
  return (
    <>
      <h1>Nutrition</h1>
      <p className="lede">Note ce que tu manges : chaque repas garde ta série en vie.</p>
      <Food meals={meals as Meal[]} targets={targets} frequent={frequent} energy={energy} goal={user.goal} />
    </>
  );
}
