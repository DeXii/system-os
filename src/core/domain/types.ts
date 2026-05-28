export type StageId = 'foundation' | 'regulation' | 'mind' | 'influence';
export type ModuleId =
  | 'command'
  | 'foundation'
  | 'regulation'
  | 'mind'
  | 'influence'
  | 'library'
  | 'integration'
  | 'director'
  | 'archive';
export type MissionPriority = 'critical' | 'routine' | 'optional';
export type MissionStatus = 'pending' | 'done' | 'skipped';
export type ModuleStatus = 'active' | 'degraded' | 'locked';
export type ProtocolPriority = 'critical' | 'routine';
export type DayPhase = 'morning' | 'day' | 'evening' | 'any';
export type FrequencyTier = 'daily' | 'maintenance' | 'intensive';
export type ScheduleItemType =
  | 'mission'
  | 'protocol'
  | 'workout'
  | 'cardio'
  | 'debrief'
  | 'briefing'
  | 'custom';
export type ScheduleSlotStatus = 'pending' | 'done' | 'skipped';
export type ExercisePattern = 'pull' | 'push' | 'core' | 'legs';
export type BarEquipment = 'bar' | 'dip' | 'none';

export type WorkoutKind =
  | 'hift'
  | 'gpp_push'
  | 'gpp_pull'
  | 'gpp_core'
  | 'gpp_legs'
  | 'warmup'
  | 'stretch'
  | 'cardio_intense'
  | 'cardio_easy'
  | 'legacy';

export type WorkoutStructure = 'circuit' | 'straight_sets' | 'cardio';

export type FitnessTier = 'beginner' | 'novice' | 'medium' | 'pro' | 'ayanakoji';

export type FitnessCategory = 'hift' | 'gpp' | 'warmup' | 'stretch';

export type ExerciseMeasure = 'reps' | 'seconds';

export type GppSubtype = 'push' | 'pull' | 'core' | 'legs';

export const FITNESS_TIER_ORDER: FitnessTier[] = [
  'beginner',
  'novice',
  'medium',
  'pro',
  'ayanakoji',
];

export const GPP_ROTATION: GppSubtype[] = ['push', 'pull', 'core', 'legs'];

export function gppKindFromSubtype(sub: GppSubtype): WorkoutKind {
  return `gpp_${sub}` as WorkoutKind;
}

export function fitnessTierLabel(tier: FitnessTier): string {
  const labels: Record<FitnessTier, string> = {
    beginner: 'Начинающий',
    novice: 'Новичок',
    medium: 'Средний',
    pro: 'Проф',
    ayanakoji: 'Ayanakoji',
  };
  return labels[tier];
}

export const STAGE_ORDER: StageId[] = ['foundation', 'regulation', 'mind', 'influence'];

export function nextStage(stage: StageId): StageId | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export interface OperatorProfile {
  id: string;
  codename: string;
  goals: string;
  startDate: string;
  currentStage: StageId;
  unlockedStages: StageId[];
  ethicsAccepted: boolean;
  onboarded: boolean;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  date: string;
  sleepHours?: number;
  nutritionOk?: boolean;
  hydrationOk?: boolean;
  stressLevel?: number;
  notes?: string;
}

export interface AcftEvent {
  id: string;
  date: string;
  mdl?: number;
  spt?: number;
  hrp?: number;
  sdc?: string;
  plk?: string;
  twoMR?: string;
  totalScore?: number;
}

/** Bar Fitness Test — турник/брусья вместо полного ACFT */
export interface BftEvent {
  id: string;
  date: string;
  maxPullups: number;
  maxDips: number;
  plankSec: number;
  hangSec?: number;
  notes?: string;
}

export interface OperatorCalibration {
  id: 'calibration';
  maxPullups: number;
  maxDips: number;
  plankSec: number;
  lastUpdated: string;
}

export interface TrainingSession {
  id: string;
  date: string;
  type: 'strength' | 'cardio' | 'hift' | 'recovery';
  durationMin: number;
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
  workoutKind?: WorkoutKind;
}

export interface CardioSession {
  id: string;
  date: string;
  kind: 'cardio_intense' | 'cardio_easy';
  durationMin: number;
  distanceKm?: number;
  avgHr?: number;
  maxHr?: number;
  notes?: string;
}

export interface OperatorFitnessLevels {
  id: 'fitness-levels';
  hift: FitnessTier;
  gpp: FitnessTier;
  warmup: FitnessTier;
  stretch: FitnessTier;
  manualOverride?: Partial<Record<FitnessCategory, FitnessTier>>;
  lastUpdated: string;
}

export interface WorkoutTypeStat {
  kind: WorkoutKind;
  totalCount: number;
  lastDate: string | null;
}

export type HrvSource = 'manual' | 'oura' | 'whoop' | 'garmin' | 'other';
export type BreathingMode = 'resonant' | 'wim_hof' | 'box' | 'custom';

export interface HrvEntry {
  id: string;
  date: string;
  rmssd?: number;
  restingHr?: number;
  source?: HrvSource;
  subjectiveReadiness?: number;
  notes?: string;
}

export interface BreathingSession {
  id: string;
  date: string;
  mode: BreathingMode;
  durationMin: number;
  breathsPerMin?: number;
  rounds?: number;
  avgRetentionSec?: number;
  notes?: string;
}

export interface MindfulnessSession {
  id: string;
  date: string;
  durationMin: number;
  type: string;
}

export interface StressLogEntry {
  id: string;
  date: string;
  trigger: string;
  reaction: string;
  technique: string;
  outcome: string;
  arousalBefore?: number;
  arousalAfter?: number;
  pstSelfTalk?: string;
  linkedTechnique?: string;
}

export interface PstEntry {
  id: string;
  date: string;
  situation: string;
  selfTalk: string;
  reframing: string;
  outcome: string;
}

export type ChessPlatform = 'lichess' | 'chesscom' | 'ogs' | 'otb' | 'other';
export type ReflectionMode = 'pmr_short' | 'pmr_extended' | 'ooda';
export type BookLevel = 1 | 2 | 3 | 4;
export type BookReadStatus = 'unread' | 'reading' | 'read';
export type BookSource = 'catalog' | 'user';

export interface ChessGoSession {
  id: string;
  date: string;
  game: 'chess' | 'go';
  durationMin: number;
  rating?: number;
  ratingAfter?: number;
  platform?: ChessPlatform;
  notes?: string;
}

export interface ReflectionEntry {
  id: string;
  date: string;
  mode?: ReflectionMode;
  plan: string;
  monitor: string;
  reflect: string;
  observe?: string;
  orient?: string;
  decide?: string;
  act?: string;
  linkedScenarioId?: string;
  linkedDecisionId?: string;
}

export interface ScenarioAnalysis {
  id: string;
  date: string;
  title: string;
  swot?: string;
  scenarios?: string;
  decision?: string;
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  threats?: string;
  scenariosText?: string;
  linkedDecisionId?: string;
  directorReview?: string;
  operationId?: string;
  contactIds?: string[];
}

export interface DecisionLogEntry {
  id: string;
  date: string;
  title: string;
  context: string;
  alternatives: string;
  choice: string;
  expectedOutcome: string;
  actualOutcome?: string;
  linkedScenarioId?: string;
  followUpDueDate?: string;
  followUpDone?: boolean;
}

export type OperationPhase = 'planning' | 'active' | 'closed';
export type OperationStatus = 'open' | 'won' | 'lost' | 'paused';

export interface ContactProfile {
  id: string;
  codename: string;
  role?: string;
  stakes?: string;
  motives?: string;
  triggers?: string;
  weaknesses?: string;
  disclosureNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Operation {
  id: string;
  title: string;
  goal: string;
  phase: OperationPhase;
  status: OperationStatus;
  deadline?: string;
  contactIds: string[];
  linkedScenarioIds: string[];
  linkedDecisionIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorDoctrine {
  id: 'doctrine';
  rules: string[];
  updatedAt: string;
}

export interface TriggerLog {
  id: string;
  date: string;
  situation: string;
  bodyReaction: string;
  actionTaken: string;
  maskScore: number;
}

export interface StudySession {
  id: string;
  date: string;
  subject: string;
  durationMin: number;
  topic: string;
  notes?: string;
}

export interface LibraryBook {
  id: string;
  level: BookLevel;
  title: string;
  author: string;
  tags: string[];
  description: string;
  source: BookSource;
  status: BookReadStatus;
  readAt?: string;
  chaptersRead?: string;
  notes?: string;
}

export type InfluenceEntryType =
  | 'mi'
  | 'nudge'
  | 'observation'
  | 'debrief'
  | 'protocol'
  | 'bias';

export type NudgeType =
  | 'default'
  | 'opt_out'
  | 'social_proof'
  | 'framing'
  | 'timing';

export interface InfluenceEntry {
  id: string;
  date: string;
  type: InfluenceEntryType;
  /** @deprecated Legacy field; not used in scoring or UI gates */
  ethicsChecked?: boolean;
  /** Legacy single-field context */
  context?: string;
  outcome?: string;
  /** MI OARS */
  situation?: string;
  openQuestions?: string;
  affirmReflect?: string;
  summarize?: string;
  whatWorked?: string;
  /** Nudge */
  nudgeType?: NudgeType;
  /** Bias log */
  biasName?: string;
  correction?: string;
  /** Influence Protocol checklist state */
  protocolChecks?: boolean[];
  contactId?: string;
  maskUsed?: string;
  infoDisclosed?: string;
  infoHeld?: string;
}

export interface Mission {
  id: string;
  date: string;
  title: string;
  description?: string;
  stage: StageId;
  priority: MissionPriority;
  status: MissionStatus;
  source?: 'manual' | 'director' | 'protocol';
  taskKey?: string;
  frequencyTier?: FrequencyTier;
}

export interface ProtocolItem {
  id: string;
  date: string;
  label: string;
  done: boolean;
  stage: StageId;
  priority: ProtocolPriority;
  phase?: DayPhase;
  taskKey?: string;
  frequencyTier?: FrequencyTier;
}

export interface ScheduleSlot {
  id: string;
  taskKey?: string;
  refId?: string;
  type: ScheduleItemType;
  title: string;
  rank: number;
  priority: MissionPriority;
  optionalStartTime?: string;
  stage?: StageId;
  status?: ScheduleSlotStatus;
}

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeekScheduleTemplate {
  id: 'week-template';
  slots: Record<WeekdayIndex, ScheduleSlot[]>;
}

export interface DayScheduleOverride {
  date: string;
  slots: ScheduleSlot[];
  note?: string;
  source: 'manual' | 'director' | 'system';
}

export interface BarExercise {
  id: string;
  name: string;
  pattern: ExercisePattern;
  equipment: BarEquipment;
  muscles: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  defaultRestSec: number;
  progressionRule: string;
}

export interface CatalogExercise extends BarExercise {
  workoutKinds: WorkoutKind[];
  tiers: FitnessTier[];
  measure: ExerciseMeasure;
  isStatic?: boolean;
  defaultTargetReps?: number;
  defaultTargetSec?: number;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  targetReps: number;
  restSec: number;
  measure?: ExerciseMeasure;
  targetSeconds?: number;
}

export interface WorkoutPlan {
  id: string;
  date: string;
  exercises: PlannedExercise[];
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
  kind?: WorkoutKind;
  structure?: WorkoutStructure;
  rounds?: number;
  roundRestSec?: number;
  circuitExerciseIds?: string[];
  gppSubtype?: GppSubtype;
}

export interface SetLog {
  id: string;
  date: string;
  workoutPlanId: string;
  exerciseId: string;
  setIndex: number;
  targetReps: number;
  actualReps: number;
  restSec: number;
  rpe?: number;
  workoutKind?: WorkoutKind;
  measure?: ExerciseMeasure;
  targetSeconds?: number;
  actualSeconds?: number;
  roundIndex?: number;
}

export interface DayReport {
  id: string;
  date: string;
  protocolPct: number;
  missionPct: number;
  compliance: number;
  debriefDone: boolean;
  briefingDone: boolean;
  eveningNotes?: string;
  stageAdjustment?: number;
}

export type StageGateSeverity = 'blocker' | 'soft';

export interface StageGateCriterion {
  id: string;
  label: string;
  met: boolean;
  current: string;
  target: string;
  weight: number;
  severity: StageGateSeverity;
}

export interface StageGateEvaluation {
  fromStage: StageId;
  toStage: StageId | null;
  criteria: StageGateCriterion[];
  blockersMet: boolean;
  softScore: number;
  eligible: boolean;
  qualifyingDays: number;
  qualifyingRequired: number;
  reasons: string[];
  evaluatedAt: string;
}

export interface DemotionCriterion {
  id: string;
  label: string;
  met: boolean;
  current: string;
  target: string;
}

export interface DemotionEvaluation {
  atRisk: boolean;
  targetStage: StageId | null;
  criteria: DemotionCriterion[];
  reasons: string[];
}

export interface ReadinessHistoryEntry {
  date: string;
  foundation: number;
  regulation: number;
  mind: number;
  influence: number;
  global: number;
  /** День засчитан для gate (blockers + soft в момент оценки) */
  qualified?: boolean;
}

export interface StageProgressState {
  id: string;
  stageStreaks: Record<StageId, number>;
  globalStreak: number;
  lastEvaluatedDate: string;
  pendingAdvance?: StageId;
  advanceSnoozeUntil?: string;
  pendingDemotion?: StageId;
  demotionSnoozeUntil?: string;
  qualifyingDays?: number;
  lastGateSnapshot?: StageGateEvaluation;
  readinessHistory?: ReadinessHistoryEntry[];
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'success' | 'error';
  module: ModuleId;
  message: string;
  taskKey?: string;
}

export interface AiInsight {
  id: string;
  taskId: string;
  scope: ModuleId | 'full';
  text: string;
  actions: AiAction[];
  createdAt: string;
}

export interface AiAction {
  type:
    | 'add_mission'
    | 'add_protocol'
    | 'log_note'
    | 'move_slot'
    | 'complete_slot'
    | 'add_schedule_slot'
    | 'set_workout_plan'
    | 'set_cardio_session_plan';
  payload: Record<string, unknown>;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  taskId?: string;
  createdAt: string;
}

export interface ReadinessScores {
  foundation: number;
  regulation: number;
  mind: number;
  influence: number;
  global: number;
}

export interface PdpMilestone {
  id: string;
  label: string;
  done: boolean;
  stage?: StageId;
}

export interface PersonalDevelopmentPlan {
  id: string;
  quarter: string;
  goals: string[];
  milestones: PdpMilestone[];
  northStar?: string;
  focusStage?: StageId;
  weeklyFocus?: string;
  updatedAt?: string;
}

export interface DirectorConfig {
  apiKey: string;
  proxyUrl: string;
  proxyToken?: string;
  model: string;
}

export const STAGE_LABELS: Record<StageId, string> = {
  foundation: 'Физиологический фундамент',
  regulation: 'Ядро саморегуляции',
  mind: 'Оружие мышления',
  influence: 'Тактика влияния',
};

export const STAGE_MODULES: Record<StageId, ModuleId> = {
  foundation: 'foundation',
  regulation: 'regulation',
  mind: 'mind',
  influence: 'influence',
};
