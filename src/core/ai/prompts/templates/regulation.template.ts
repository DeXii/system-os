export function renderRegulationTemplate(): string {
  return `ЗАДАЧА: план HRV, дыхания, mindfulness, PST на сегодня.
Данные: regulation.hrvTrendInWindow, hrvBaseline14d, breathing7d, triggerLogsInWindow, readiness.
При constraints.flags.wimHofBlocked — не Wim Hof; при низком HRV — резонансное дыхание 10 мин.
В «Решение»: режим НС, HRV/дыхание, mindfulness/PST, 3 действия.
При слотах — add_protocol / complete_slot (regulation.hrv, regulation.breathing.resonant, regulation.mindfulness).`;
}
