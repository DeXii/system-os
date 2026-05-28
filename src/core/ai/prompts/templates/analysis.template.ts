import type { AnalysisTemplateParams } from '../../director/director-types';

export function renderAnalysisTemplate(params: AnalysisTemplateParams): string {
  const { kind, days } = params;

  if (kind === 'deep') {
    const d = days ?? 14;
    return `ЗАДАЧА: системный анализ за ${d} календарных дней (contextLookbackDays=${d}).
Охвати foundation, regulation, mind, influence + integration.synergy, compliance.trendInWindow, stageProgress.
Тренды, провалы, bottleneck, корреляции. Не выходи за contextSinceDate.
В «Решение»: executive summary, 4 оси (${d}d), synergy/bottleneck, план на ${d === 30 ? '14' : '7'} дней (taskKey).`;
  }

  switch (kind) {
    case 'weekly':
      return `ЗАДАЧА: аудит недели по 4 этапам OS.
Данные: integration.ops7d, synergy, stages, compliance.trendInWindow, stageProgress, bottleneck.
В «Решение»: FOUNDATION, REGULATION, MIND, INFLUENCE, synergy/bottleneck, главная корректировка.`;
    case 'pdp':
      return `ЗАДАЧА: разбор PDP (integration.pdp, operator.goals, currentStage).
В «Решение»: соответствие этапу, слабые вехи, фокус недели, 3 корректировки.`;
    case 'stageGate':
      return `ЗАДАЧА: gate / demotion (stageProgress, failedBlockers, pendingDemotion).
При demotion — план отката 7–14 дней.
В «Решение»: диагноз, риск отката, план 7 дней (taskKey), критерий advance.`;
    case 'doctrine':
      return `ЗАДАЧА: сверка с doctrine.rules и operatorMode.
В «Решение»: соответствие, нарушения, корректировка правил, фокус 7 дней.`;
    default:
      return '';
  }
}
