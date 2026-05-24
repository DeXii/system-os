import type { StageId } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  pendingAdvance?: StageId;
  pendingDemotion?: StageId;
  onAcceptAdvance?: () => void;
  onSnoozeAdvance?: () => void;
  onAcceptDemotion?: () => void;
  onSnoozeDemotion?: () => void;
}

export function StageTransitionBanner({
  pendingAdvance,
  pendingDemotion,
  onAcceptAdvance,
  onSnoozeAdvance,
  onAcceptDemotion,
  onSnoozeDemotion,
}: Props) {
  if (!pendingAdvance && !pendingDemotion) return null;

  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pendingAdvance && (
        <div className="panel" style={{ borderColor: 'var(--success)' }}>
          <div className="panel-title">STAGE ADVANCE — РЕКОМЕНДАЦИЯ СИСТЕМЫ</div>
          <GlossaryZone>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              Stage advance: критерии gate выполнены. Переход на этап выше; пройденные этапы — в
              режиме maintenance.
            </p>
          </GlossaryZone>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={onAcceptAdvance}>
              Принять переход
            </button>
            <button type="button" className="btn btn-sm" onClick={onSnoozeAdvance}>
              Отложить 7 дней
            </button>
          </div>
        </div>
      )}
      {pendingDemotion && (
        <div className="panel" style={{ borderColor: 'var(--danger)' }}>
          <div className="panel-title">STAGE DEMOTION — ПРОСЕДАНИЕ БАЗЫ</div>
          <GlossaryZone>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              Stage demotion: просела база foundation. Фокус сместится на recovery и силу; остальные
              этапы останутся разблокированы.
            </p>
          </GlossaryZone>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm" style={{ borderColor: 'var(--danger)' }} onClick={onAcceptDemotion}>
              Принять откат
            </button>
            <button type="button" className="btn btn-sm" onClick={onSnoozeDemotion}>
              Отложить 7 дней
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
