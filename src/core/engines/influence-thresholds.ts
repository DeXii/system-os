/** Calibrated influence scoring, throttle gates, and directive thresholds. */
export const INFLUENCE_THRESHOLDS = {
  coldStart: 50,
  coldLookbackDays: 14,
  /** Throttle tactical load when lower modules are weak. */
  throttleFoundationBelow: 45,
  throttleRegulationBelow: 40,
  throttleMindBelow: 40,
  /** MI entries in 14d for full MI score component. */
  miCountTarget14d: 2,
  miScoreMax: 35,
  nudgeScoreMax: 20,
  protocolDaysTarget14d: 2,
  protocolScoreMax: 15,
  biasObsScoreMax: 15,
  dossierContactScore: 5,
  dossierOpsScore: 5,
  dossierScoreMax: 10,
  /** Quality bonus from adaptive params (max additive points). */
  qualityBonusMax: 8,
  miDepthEmaForFullQuality: 0.65,
  miEfficacyEmaForFullQuality: 0.55,
  /** Weekly MI dose bounds. */
  miDoseWeeklyMin: 1,
  miDoseWeeklyMax: 5,
  /** Directive: low efficacy → reduce new contacts. */
  miEfficacyLow: 0.4,
  /** Streak break triggers stronger MI action hint. */
  miStreakMinForRoutine: 1,
} as const;
