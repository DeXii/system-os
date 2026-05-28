import type { DayReport } from '@/core/domain/types';
import type { TaskId } from '@/core/ai/director-tasks';

interface ProactiveItem {
  hint: string;
  taskId?: TaskId;
  label?: string;
}

interface Props {
  hints: string[];
  dayReport: DayReport | null;
  onRunDirector: (taskId: TaskId) => void;
  directorLoading: boolean;
}

const TASK_HINT_MAP: { match: RegExp; taskId: TaskId; label: string }[] = [
  { match: /briefing/i, taskId: 'morningBriefing', label: 'Briefing' },
  { match: /debrief/i, taskId: 'eveningDebrief', label: 'Debrief' },
  { match: /решени/i, taskId: 'decisionFollowUp', label: 'Follow-up' },
  { match: /операци/i, taskId: 'operationReview', label: 'Operation' },
  { match: /доктрин/i, taskId: 'doctrineReview', label: 'Doctrine' },
  { match: /Debrief по контакту/i, taskId: 'contactBrief', label: 'Contact' },
];

function mapHintToAction(hint: string): ProactiveItem {
  const mapped = TASK_HINT_MAP.find((m) => m.match.test(hint));
  if (mapped) {
    return { hint, taskId: mapped.taskId, label: mapped.label };
  }
  return { hint };
}

export function ProactiveOpsBanner({
  hints,
  dayReport,
  onRunDirector,
  directorLoading,
}: Props) {
  const critical: ProactiveItem[] = [];

  if (dayReport && !dayReport.briefingDone) {
    critical.push({
      hint: 'Утренний briefing не выполнен',
      taskId: 'morningBriefing',
      label: 'Briefing',
    });
  }

  for (const h of hints.slice(0, 6)) {
    critical.push(mapHintToAction(h));
  }

  const unique = critical.filter(
    (item, i, arr) => arr.findIndex((x) => x.hint === item.hint) === i
  );

  if (unique.length === 0) return null;

  return (
    <div className="panel" style={{ marginBottom: '1rem', borderColor: 'var(--warn)' }}>
      <div className="panel-title">PROACTIVE OPS</div>
      <ul className="mission-list">
        {unique.map((item) => (
          <li key={item.hint} className="check-row" style={{ alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 12 }}>{item.hint}</span>
            {item.taskId && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={directorLoading}
                onClick={() => onRunDirector(item.taskId!)}
              >
                {item.label ?? 'DIRECTOR'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
