import Dexie, { type Table } from 'dexie';
import type {
  OperatorProfile,
  DailyLog,
  AcftEvent,
  BftEvent,
  TrainingSession,
  HrvEntry,
  BreathingSession,
  MindfulnessSession,
  StressLogEntry,
  PstEntry,
  ChessGoSession,
  ReflectionEntry,
  ScenarioAnalysis,
  DecisionLogEntry,
  LibraryBook,
  InfluenceEntry,
  Mission,
  ProtocolItem,
  SystemEvent,
  AiInsight,
  AiMessage,
  PersonalDevelopmentPlan,
  DayReport,
  StageProgressState,
  WeekScheduleTemplate,
  DayScheduleOverride,
  WorkoutPlan,
  SetLog,
  OperatorCalibration,
} from '../domain/types';
import type { GlossaryCacheEntry } from '../glossary/types';

export class AyanakojiDB extends Dexie {
  operator!: Table<OperatorProfile, string>;
  dailyLogs!: Table<DailyLog, string>;
  acftEvents!: Table<AcftEvent, string>;
  bftEvents!: Table<BftEvent, string>;
  trainingSessions!: Table<TrainingSession, string>;
  hrvEntries!: Table<HrvEntry, string>;
  breathingSessions!: Table<BreathingSession, string>;
  mindfulnessSessions!: Table<MindfulnessSession, string>;
  stressLogs!: Table<StressLogEntry, string>;
  pstEntries!: Table<PstEntry, string>;
  chessGoSessions!: Table<ChessGoSession, string>;
  reflections!: Table<ReflectionEntry, string>;
  scenarios!: Table<ScenarioAnalysis, string>;
  decisionLogs!: Table<DecisionLogEntry, string>;
  libraryBooks!: Table<LibraryBook, string>;
  influenceEntries!: Table<InfluenceEntry, string>;
  missions!: Table<Mission, string>;
  protocolItems!: Table<ProtocolItem, string>;
  systemEvents!: Table<SystemEvent, string>;
  aiInsights!: Table<AiInsight, string>;
  aiMessages!: Table<AiMessage, string>;
  pdp!: Table<PersonalDevelopmentPlan, string>;
  dayReports!: Table<DayReport, string>;
  stageProgress!: Table<StageProgressState, string>;
  weekTemplate!: Table<WeekScheduleTemplate, string>;
  dayOverrides!: Table<DayScheduleOverride, string>;
  workoutPlans!: Table<WorkoutPlan, string>;
  setLogs!: Table<SetLog, string>;
  operatorCalibration!: Table<OperatorCalibration, string>;
  glossaryCache!: Table<GlossaryCacheEntry, string>;

  constructor() {
    super('ayanakoji_os');
    this.version(1).stores({
      operator: 'id',
      dailyLogs: 'id, date',
      acftEvents: 'id, date',
      trainingSessions: 'id, date',
      hrvEntries: 'id, date',
      breathingSessions: 'id, date',
      mindfulnessSessions: 'id, date',
      stressLogs: 'id, date',
      chessGoSessions: 'id, date',
      reflections: 'id, date',
      scenarios: 'id, date',
      influenceEntries: 'id, date',
      missions: 'id, date, status',
      protocolItems: 'id, date',
      systemEvents: 'id, timestamp',
      aiInsights: 'id, createdAt',
      aiMessages: 'id, createdAt',
      pdp: 'id',
    });
    this.version(2)
      .stores({
        dayReports: 'id, date',
        stageProgress: 'id',
      })
      .upgrade(async (tx) => {
        const protocols = await tx.table('protocolItems').toArray();
        for (const p of protocols) {
          if (!('priority' in p) || !p.priority) {
            await tx.table('protocolItems').update(p.id, {
              priority: 'routine',
              phase: 'any',
            });
          }
        }
        const existing = await tx.table('stageProgress').get('progress');
        if (!existing) {
          await tx.table('stageProgress').put({
            id: 'progress',
            stageStreaks: {
              foundation: 0,
              regulation: 0,
              mind: 0,
              influence: 0,
            },
            globalStreak: 0,
            lastEvaluatedDate: '',
          });
        }
      });
    this.version(3)
      .stores({
        bftEvents: 'id, date',
        weekTemplate: 'id',
        dayOverrides: 'date',
        workoutPlans: 'id, date, status',
        setLogs: 'id, date, workoutPlanId',
        operatorCalibration: 'id',
      })
      .upgrade(async (tx) => {
        const operators = await tx.table('operator').toArray();
        for (const op of operators) {
          const updates: Record<string, unknown> = {};
          if (!op.unlockedStages) {
            updates.unlockedStages = [op.currentStage ?? 'foundation'];
          }
          if (Object.keys(updates).length) {
            await tx.table('operator').update(op.id, updates);
          }
        }
        const missions = await tx.table('missions').toArray();
        for (const m of missions) {
          if (!m.taskKey) {
            await tx.table('missions').update(m.id, {
              taskKey: inferTaskKeyFromTitle(m.title, m.stage),
              frequencyTier: m.priority === 'critical' ? 'daily' : 'maintenance',
            });
          }
        }
        const protocols = await tx.table('protocolItems').toArray();
        for (const p of protocols) {
          if (!p.taskKey) {
            await tx.table('protocolItems').update(p.id, {
              taskKey: inferTaskKeyFromLabel(p.label, p.stage),
              frequencyTier: p.priority === 'critical' ? 'daily' : 'maintenance',
            });
          }
        }
      });
    this.version(4)
      .stores({
        pstEntries: 'id, date',
      })
      .upgrade(async (tx) => {
        const breaths = await tx.table('breathingSessions').toArray();
        for (const b of breaths) {
          const updates: Record<string, unknown> = {};
          if (!b.mode) {
            updates.mode = b.breathsPerMin ? 'resonant' : 'custom';
          }
          if (Object.keys(updates).length) {
            await tx.table('breathingSessions').update(b.id, updates);
          }
        }
      });
    this.version(5)
      .stores({
        decisionLogs: 'id, date',
        libraryBooks: 'id, level, status, source',
      })
      .upgrade(async (tx) => {
        const scenarios = await tx.table('scenarios').toArray();
        for (const s of scenarios) {
          const updates: Record<string, unknown> = {};
          if (s.swot && !s.strengths) {
            updates.strengths = s.swot;
          }
          if (s.scenarios && !s.scenariosText) {
            updates.scenariosText = s.scenarios;
          }
          if (Object.keys(updates).length) {
            await tx.table('scenarios').update(s.id, updates);
          }
        }
        const reflections = await tx.table('reflections').toArray();
        for (const r of reflections) {
          if (!r.mode) {
            await tx.table('reflections').update(r.id, { mode: 'pmr_short' });
          }
        }
      });
    this.version(6).upgrade(async (tx) => {
      const entries = await tx.table('influenceEntries').toArray();
      for (const e of entries) {
        const updates: Record<string, unknown> = {};
        if (e.context && !e.situation && e.type === 'mi') {
          updates.situation = e.context;
        }
        if (e.context && !e.situation && e.type !== 'mi') {
          updates.situation = e.context;
        }
        if (Object.keys(updates).length) {
          await tx.table('influenceEntries').update(e.id, updates);
        }
      }
    });
    this.version(7).upgrade(async (tx) => {
      const pdps = await tx.table('pdp').toArray();
      for (const p of pdps) {
        const milestones = (p.milestones ?? []).map(
          (m: { id?: string; label: string; done: boolean; stage?: string }) => ({
            id: m.id ?? uid(),
            label: m.label,
            done: m.done ?? false,
            stage: m.stage,
          })
        );
        await tx.table('pdp').update(p.id, { milestones });
      }
    });
    this.version(8).upgrade(async (tx) => {
      const progress = await tx.table('stageProgress').get('progress');
      if (progress) {
        await tx.table('stageProgress').update('progress', {
          qualifyingDays: progress.qualifyingDays ?? 0,
          readinessHistory: progress.readinessHistory ?? [],
        });
      }
    });
    this.version(9).stores({
      glossaryCache: 'id, term',
    });
    this.version(10).stores({
      setLogs: 'id, date, workoutPlanId, exerciseId',
      aiInsights: 'id, createdAt, taskId, scope',
    });
  }
}

function inferTaskKeyFromTitle(title: string, stage: string): string {
  const t = title.toLowerCase();
  if (t.includes('debrief')) return 'command.debrief';
  if (t.includes('acft') || t.includes('baseline')) return 'foundation.bft';
  if (t.includes('gpp') || t.includes('hift')) return 'foundation.gpp';
  if (t.includes('recovery')) return 'foundation.recovery';
  if (t.includes('wim') || t.includes('хоф')) return 'regulation.breathing.wimhof';
  if (t.includes('резонанс') || t.includes('дыхан')) return 'regulation.breathing.resonant';
  if (t.includes('hrv')) return 'regulation.hrv';
  if (t.includes('stress')) return 'regulation.stress';
  if (t.includes('pst')) return 'regulation.pst';
  if (t.includes('mindfulness') || t.includes('mmft')) return 'regulation.mindfulness';
  if (t.includes('шахмат') || t.includes('go')) return 'mind.chess';
  if (t.includes('swot') || t.includes('сценар')) return 'mind.scenario';
  if (t.includes('метапознан') || t.includes('решил')) return 'mind.reflect';
  if (t.includes('nudge')) return 'influence.nudge';
  if (t.includes('mi') || t.includes('вопрос')) return 'influence.mi';
  if (t.includes('искажен')) return 'influence.bias';
  if (t.includes('protocol') || t.includes('протокол')) return 'influence.protocol';
  return `${stage}.mission.${title.slice(0, 20).replace(/\s+/g, '_')}`;
}

function inferTaskKeyFromLabel(label: string, stage: string): string {
  const t = label.toLowerCase();
  if (t.includes('gpp') || t.includes('hift')) return 'foundation.gpp';
  if (t.includes('recovery')) return 'foundation.recovery';
  if (t.includes('wim') || t.includes('хоф')) return 'regulation.breathing.wimhof';
  if (t.includes('резонанс') || t.includes('дыхан')) return 'regulation.breathing.resonant';
  if (t.includes('hrv')) return 'regulation.hrv';
  if (t.includes('stress')) return 'regulation.stress';
  if (t.includes('шахмат') || t.includes('go')) return 'mind.chess';
  if (t.includes('метапознан') || t.includes('reflect')) return 'mind.reflect';
  if (t.includes('ethics') || t.includes('protocol') || t.includes('протокол'))
    return 'influence.protocol';
  if (t.includes('nudge')) return 'influence.nudge';
  if (t.includes('наблюден') || t.includes('observation')) return 'influence.observation';
  if (t.includes('mi') || t.includes('debrief')) return 'influence.mi';
  if (t.includes('audit') || t.includes('аудит')) return 'integration.weekly_audit';
  if (t.includes('pdp')) return 'integration.pdp_review';
  return `${stage}.protocol.${label.slice(0, 20).replace(/\s+/g, '_')}`;
}

export function dateKeyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export const db = new AyanakojiDB();

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayKey(d = new Date()): string {
  return d.toISOString().split('T')[0];
}

export function weekdayIndex(d = new Date()): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const js = d.getDay();
  return (js === 0 ? 6 : js - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function tomorrowKey(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return todayKey(d);
}
