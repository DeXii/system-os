/** Calibrated regulation scoring and safety gates (single source of truth). */
export const REGULATION_THRESHOLDS = {
  /** Legacy ratio when EMA z-score unavailable. */
  baselineRatio: 0.85,
  /** z below this → below personal baseline. */
  hrvZBelow: -1,
  /** z below this → recovery-only breathing. */
  hrvZRecovery: -1,
  /** z below this → hard deny high autonomic load. */
  hrvZHardDeny: -1.5,
  /** Absolute RMSSD floor after Wim Hof (ms). */
  wimHofLowRmssd: 25,
  /** Split-half trend delta (ms) for readiness bonus/penalty. */
  hrvTrendDeltaUp: 5,
  hrvTrendDeltaDown: -5,
  readinessTrendBonusHigh: 15,
  readinessTrendBonusLow: 8,
  readinessTrendPenalty: -10,
  wimHofOveruse7d: 3,
  resonantMinWithWim7d: 2,
  wimHofOverusePenalty: 5,
  wimHofLowHrvPenalty: 8,
  /** Minimum wimHofTolerance to allow calendar Wim Hof slot. */
  wimHofToleranceMin: 0.4,
  /** Daily log stress 1–10: penalty from this level. */
  dailyStressPenaltyFrom: 8,
  dailyStressPenalty: 4,
  sleepHoursPenaltyBelow: 6,
  sleepPenalty: 4,
  subjectiveFusionWeightHrv: 0.6,
  subjectiveFusionWeightSubj: 0.4,
  subjectiveReadinessBonusMax: 5,
  pstEfficacyBonusMax: 5,
  maskBurdenPenaltyFrom: 3.5,
  maskBurdenPenalty: 3,
  arousalMin: 1,
  arousalMax: 10,
  rmssdMin: 5,
  rmssdMax: 250,
  restingHrMin: 30,
  restingHrMax: 120,
  subjectiveReadinessMin: 1,
  subjectiveReadinessMax: 10,
} as const;
