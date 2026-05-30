export function renderRegulationTemplate(): string {
  return `ЗАДАЧА: регуляция на сегодня.
Используй regulationDirective из контекста ([РАСЧЁТ]/[ДЕЙСТВИЕ]/[ОТКАЗ]) — не переписывай общими советами.
Учитывай z_HRV, fusionReadiness, pstEfficacy, maskBurden7d, dailyLog (сон/стресс).
Один протокол: HRV / резонанс / mindfulness; при wimHofBlocked или z_HRV < −1 — без Wim Hof.`;
}
