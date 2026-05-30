import type { AiAction } from '../../domain/types';
import type { ContextManifest } from '../context/context-slice-types';

export type PromptTemplateId =
  | 'training'
  | 'briefing'
  | 'analysis'
  | 'cognitive'
  | 'regulation'
  | 'nutrition'
  | 'communication'
  | 'planning'
  | 'library';

export type OutputFormatId =
  | 'commandMorning'
  | 'commandEvening'
  | 'analysisWeekly'
  | 'analysisDeep'
  | 'coachWorkout'
  | 'coachRegulation'
  | 'coachMind'
  | 'coachInfluence'
  | 'coachLibrary'
  | 'minimal';

export type ConstraintId =
  | 'dataIntegrity'
  | 'equipment'
  | 'readiness'
  | 'training'
  | 'cognitive'
  | 'communication'
  | 'scheduling'
  | 'doctrine';

export type OperatorAiMode =
  | 'recovery'
  | 'overload'
  | 'tactical'
  | 'focus'
  | 'degraded';

export interface TrainingTemplateParams {
  mode?: 'coach' | 'plan';
  variant?:
    | 'hift'
    | 'gpp'
    | 'gpp_push'
    | 'gpp_pull'
    | 'gpp_core'
    | 'gpp_legs'
    | 'warmup'
    | 'stretch'
    | 'cardio_intense'
    | 'cardio_easy'
    | 'legacy';
  intensity?: 'light' | 'moderate' | 'edge';
  requireActions?: boolean;
}

export interface AnalysisTemplateParams {
  kind: 'weekly' | 'deep' | 'pdp' | 'stageGate' | 'doctrine';
  days?: 14 | 30;
}

export interface BriefingTemplateParams {
  kind: 'morning' | 'evening' | 'contact';
}

export interface CognitiveTemplateParams {
  kind: 'coach' | 'tacticalDebrief' | 'decisionFollowUp';
}

export interface CommunicationTemplateParams {
  kind: 'coach' | 'contactBrief' | 'preContact' | 'operationReview';
}

export interface PlanningTemplateParams {
  kind: 'reschedule' | 'weekSchedule' | 'free';
}

export type TemplateParams =
  | TrainingTemplateParams
  | AnalysisTemplateParams
  | BriefingTemplateParams
  | CognitiveTemplateParams
  | CommunicationTemplateParams
  | PlanningTemplateParams
  | Record<string, never>;

export interface DirectorTaskPromptConfig {
  templateId: PromptTemplateId;
  templateParams?: TemplateParams;
  outputFormat: OutputFormatId;
  allowedActions: AiAction['type'][];
  constraintIds: ConstraintId[];
  taskInstruction?: string;
  /** Resolved via getContextManifest(taskId); optional duplicate for tooling */
  contextManifest?: ContextManifest;
}

export interface ExerciseCatalogSnapshotEntry {
  id: string;
  name?: string;
  pattern?: string;
}

export interface ParsedContextSnapshot {
  allowedExerciseIds?: string[];
  exerciseCatalog?: ExerciseCatalogSnapshotEntry[];
  todayTaskKeys?: string[];
  contextSinceDate?: string;
  readiness?: {
    foundation: number;
    regulation: number;
    mind: number;
    influence: number;
  };
  flags?: Record<string, boolean>;
}

export interface ValidateActionsOptions {
  allowedActions: AiAction['type'][];
  context: ParsedContextSnapshot;
}
