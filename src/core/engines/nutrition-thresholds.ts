/** Calibrated nutrition scoring, adherence gates, and cross-module throttles. */
export const NUTRITION_THRESHOLDS = {
  coldStart: 50,
  coldLookbackDays: 14,
  proteinOkRatio: 0.8,
  proteinConsistencyRatio: 0.75,
  calBandLow: 0.85,
  calBandHigh: 1.15,
  minCompletedMealsForCalOk: 2,
  defaultProteinTarget: 100,
  defaultCalorieTarget: 2200,
  proteinSigmaFloor: 400,
  adherenceLow: 0.6,
  proteinGapHigh: 40,
  foundationThrottleBelow: 45,
  regulationThrottleBelow: 40,
  reviewMinLoggedDays7d: 4,
  consistencyReviewDonePct: 75,
} as const;
