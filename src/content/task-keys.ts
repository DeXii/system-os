import type { StageId } from '@/core/domain/types';

export const TASK_KEYS = {
  briefing: 'command.briefing',
  debrief: 'command.debrief',
  foundationWorkout: 'foundation.workout',
  foundationGpp: 'foundation.gpp',
  foundationRecovery: 'foundation.recovery',
  foundationBft: 'foundation.bft',
  foundationCardio: 'foundation.cardio',
  nutritionLog: 'nutrition.log',
  nutritionReview: 'nutrition.review',
  nutritionPlanApply: 'nutrition.plan',
  regulationBreathing: 'regulation.breathing',
  regulationBreathingResonant: 'regulation.breathing.resonant',
  regulationBreathingWimhof: 'regulation.breathing.wimhof',
  regulationHrv: 'regulation.hrv',
  regulationMindfulness: 'regulation.mindfulness',
  regulationStress: 'regulation.stress',
  regulationPst: 'regulation.pst',
  mindChess: 'mind.chess',
  mindReflect: 'mind.reflect',
  mindReflectShort: 'mind.reflect.short',
  mindReflectExtended: 'mind.reflect.extended',
  mindScenario: 'mind.scenario',
  mindDecisionLog: 'mind.decision_log',
  readingWeekly: 'os.reading.weekly',
  influenceProtocol: 'influence.protocol',
  influenceMi: 'influence.mi',
  influenceNudge: 'influence.nudge',
  influenceObservation: 'influence.observation',
  influenceContactPrep: 'influence.contact_prep',
  influenceOperationReview: 'influence.operation_review',
  mindDecisionFollowup: 'mind.decision.followup',
  mindStudy: 'mind.study',
  regulationTriggerLog: 'regulation.trigger_log',
  commandDoctrineReview: 'command.doctrine_review',
  integrationWeeklyAudit: 'integration.weekly_audit',
  integrationPdpReview: 'integration.pdp_review',
} as const;

export const STAGE_TASK_KEYS: Record<
  StageId,
  { anchor: string; protocol: [string, string]; extras: [string, string] }
> = {
  foundation: {
    anchor: TASK_KEYS.foundationGpp,
    protocol: [TASK_KEYS.foundationGpp, TASK_KEYS.foundationRecovery],
    extras: [TASK_KEYS.foundationBft, 'foundation.stress_training'],
  },
  regulation: {
    anchor: TASK_KEYS.regulationBreathingResonant,
    protocol: [TASK_KEYS.regulationBreathingResonant, TASK_KEYS.regulationHrv],
    extras: [TASK_KEYS.regulationMindfulness, TASK_KEYS.regulationPst],
  },
  mind: {
    anchor: TASK_KEYS.mindChess,
    protocol: [TASK_KEYS.mindChess, TASK_KEYS.mindReflectShort],
    extras: [TASK_KEYS.mindScenario, TASK_KEYS.mindDecisionLog],
  },
  influence: {
    anchor: TASK_KEYS.influenceMi,
    protocol: [TASK_KEYS.influenceMi, TASK_KEYS.influenceNudge],
    extras: ['influence.open_questions', 'influence.bias'],
  },
};
