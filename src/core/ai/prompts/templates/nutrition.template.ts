export function renderNutritionTemplate(): string {
  return `ЗАДАЧА: питание на сегодня / неделю.
Используй nutritionDirective из контекста ([РАСЧЁТ]/[ДЕЙСТВИЕ]/[ОТКАЗ]) — не переписывай общими советами.
Учитывай protein_gap, adherence_ema, consistency_7d, foundation/regulation readiness.
Один конкретный шаг: слот приёма, граммы белка, taskKey nutrition.log / nutrition.plan.`;
}
