/**
 * FACT layer — immutable user/operator events persisted in IndexedDB.
 * Source of truth for types: ../types.ts
 */

import type {
  AcftEvent,
  BftEvent,
  BreathingSession,
  CardioSession,
  ChessGoSession,
  ContactProfile,
  DailyLog,
  DecisionLogEntry,
  HrvEntry,
  InfluenceEntry,
  LibraryBook,
  MindfulnessSession,
  Mission,
  Operation,
  ProtocolItem,
  PstEntry,
  ReflectionEntry,
  ScenarioAnalysis,
  SetLog,
  StressLogEntry,
  StudySession,
  TrainingSession,
  TriggerLog,
  WorkoutPlan,
} from '../types';

/** Optional metadata on persisted facts (Dexie v13+) */
export type EntitySource = 'manual' | 'director' | 'system' | 'import';

export interface EntityMeta {
  createdAt?: string;
  updatedAt?: string;
  source?: EntitySource;
  revision?: number;
  deviceId?: string;
}

export type FactMission = Mission & EntityMeta;
export type FactProtocolItem = ProtocolItem & EntityMeta;
export type FactSetLog = SetLog & EntityMeta;
export type FactHrvEntry = HrvEntry & EntityMeta;
export type FactBreathingSession = BreathingSession & EntityMeta;
export type FactMindfulnessSession = MindfulnessSession & EntityMeta;
export type FactStressLogEntry = StressLogEntry & EntityMeta;
export type FactPstEntry = PstEntry & EntityMeta;
export type FactTrainingSession = TrainingSession & EntityMeta;
export type FactCardioSession = CardioSession & EntityMeta;
export type FactDailyLog = DailyLog & EntityMeta;
export type FactWorkoutPlan = WorkoutPlan & EntityMeta;
export type FactAcftEvent = AcftEvent & EntityMeta;
export type FactBftEvent = BftEvent & EntityMeta;
export type FactChessGoSession = ChessGoSession & EntityMeta;
export type FactReflectionEntry = ReflectionEntry & EntityMeta;
export type FactScenarioAnalysis = ScenarioAnalysis & EntityMeta;
export type FactDecisionLogEntry = DecisionLogEntry & EntityMeta;
export type FactInfluenceEntry = InfluenceEntry & EntityMeta;
export type FactContactProfile = ContactProfile;
export type FactOperation = Operation;
export type FactTriggerLog = TriggerLog & EntityMeta;
export type FactStudySession = StudySession & EntityMeta;
export type FactLibraryBook = LibraryBook & EntityMeta;

export type OsFact =
  | FactMission
  | FactProtocolItem
  | FactSetLog
  | FactHrvEntry
  | FactBreathingSession
  | FactMindfulnessSession
  | FactStressLogEntry
  | FactTrainingSession
  | FactChessGoSession
  | FactReflectionEntry
  | FactInfluenceEntry;
