import {

  getPyramidStageScores,

  getWeakestPyramidStage,

} from '@/core/engines/integration-metrics';

import type { ModuleId, ReadinessScores, StageId } from '@/core/domain/types';

import { STAGE_MODULES } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';



/** Ширина уровня пирамиды: этап 1 шире, этап 4 уже */

const PYRAMID_WIDTH: Record<number, string> = {

  1: '100%',

  2: '94%',

  3: '88%',

  4: '82%',

};



interface Props {

  readiness: ReadinessScores;

  currentStageId?: StageId;

  onNavigateModule?: (id: ModuleId) => void;

}



export function PyramidPanel({ readiness, currentStageId, onNavigateModule }: Props) {

  const stages = getPyramidStageScores(readiness);

  const weak = getWeakestPyramidStage(stages);



  return (

    <div className="panel">

      <div className="panel-title">Пирамида — 4 этапа OS</div>

      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
          Снизу вверх: этап 1 (FOUNDATION) → этап 4 (INFLUENCE). Клик — открыть модуль.
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Зелёная рамка = ваш текущий фокус · Жёлтая = узкое место (min readiness)
        </p>
      </GlossaryZone>

      <div className="pyramid-stack">

        {[...stages].reverse().map((s) => {

          const isWeak = weak != null && s.stageId === weak.stageId;

          const isCurrent = s.stageId === currentStageId;

          const showWeakLabel = isWeak && !isCurrent;

          return (

            <button

              key={s.stageId}

              type="button"

              className={`pyramid-level ${isWeak ? 'weak' : ''} ${isCurrent ? 'current' : ''}`}

              style={{ width: PYRAMID_WIDTH[s.stageNumber], marginLeft: 'auto', marginRight: 'auto' }}

              onClick={() => onNavigateModule?.(STAGE_MODULES[s.stageId])}

              title={onNavigateModule ? `Открыть ${s.stageId.toUpperCase()}` : undefined}

            >

              <div className="pyramid-level-header">

                <strong>

                  Этап {s.stageNumber}: {s.name}

                  {isCurrent ? ' · ТЕКУЩИЙ ФОКУС' : ''}

                  {showWeakLabel ? ' · узкое место' : ''}

                </strong>

                <span className="pyramid-score">{s.score}</span>

              </div>

            </button>

          );

        })}

      </div>

    </div>

  );

}


