import { STAGE_LABELS, type StageId } from '@/core/domain/types';

interface Props {
  pendingAdvance?: StageId;
  onAccept: () => void;
  onSnooze: () => void;
}

export function StageAdvanceBanner({ pendingAdvance, onAccept, onSnooze }: Props) {
  if (!pendingAdvance) return null;
  return (
    <div className="panel" style={{ borderColor: 'var(--success)', marginBottom: '1rem' }}>
      <div className="panel-title">STAGE ADVANCE — РЕКОМЕНДАЦИЯ СИСТЕМЫ</div>
      <p style={{ fontSize: 13, marginBottom: '0.75rem' }}>
        Пороги достигнуты (14 дней, readiness ≥75/60, debrief ≥80%). Переход на:{' '}
        <strong>{STAGE_LABELS[pendingAdvance]}</strong>. Новые задачи добавятся; пройденные этапы
        останутся в режиме <em>maintenance</em> (1 пункт/день).
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={onAccept}>
          Принять переход
        </button>
        <button type="button" className="btn btn-sm" onClick={onSnooze}>
          Отложить 7 дней
        </button>
      </div>
    </div>
  );
}
