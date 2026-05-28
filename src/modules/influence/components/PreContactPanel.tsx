import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterProtocolComplete } from '@/core/engines/os-kernel';
import { TACTICAL_PROTOCOL_ITEMS } from '@/content/influence-protocols';
import { ContactSelect } from './ContactSelect';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';
import { getTaskMeta, type DirectorTaskMeta } from '@/core/ai/director-tasks';

interface Props {
  onSaved: () => void;
}

const PRE_CONTACT_TASKS = ['contactBrief', 'preContactSimulation'] as const;

export function PreContactPanel({ onSaved }: Props) {
  const [contactId, setContactId] = useState('');
  const [maskUsed, setMaskUsed] = useState('');
  const [goal, setGoal] = useState('');
  const [forbiddenTopics, setForbiddenTopics] = useState('');
  const [checks, setChecks] = useState<boolean[]>(
    TACTICAL_PROTOCOL_ITEMS.map(() => false)
  );

  const savePrep = async () => {
    await afterProtocolComplete({
      date: todayKey(),
      type: 'protocol',
      contactId: contactId || undefined,
      maskUsed: maskUsed || undefined,
      infoHeld: forbiddenTopics || undefined,
      situation: goal || undefined,
      protocolChecks: checks,
      context: [goal, maskUsed, forbiddenTopics].filter(Boolean).join(' | '),
    });
    setMaskUsed('');
    setGoal('');
    setForbiddenTopics('');
    setChecks(TACTICAL_PROTOCOL_ITEMS.map(() => false));
    onSaved();
  };

  const directorTasks: DirectorTaskMeta[] = PRE_CONTACT_TASKS.map((id) => getTaskMeta(id)).filter(
    (t): t is DirectorTaskMeta => !!t
  );

  return (
    <div className="panel">
      <div className="panel-title">Pre-Contact · Подготовка</div>
      <div className="form-row">
        <label className="label">Контакт</label>
        <ContactSelect value={contactId} onChange={setContactId} />
      </div>
      <div className="form-row">
        <label className="label">Цель контакта</label>
        <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>
      <div className="form-row">
        <label className="label">Маска (образ)</label>
        <input
          className="input"
          value={maskUsed}
          onChange={(e) => setMaskUsed(e.target.value)}
          placeholder="Какой образ показываем"
        />
      </div>
      <div className="form-row">
        <label className="label">Не раскрывать</label>
        <textarea
          className="textarea"
          value={forbiddenTopics}
          onChange={(e) => setForbiddenTopics(e.target.value)}
        />
      </div>
      <ul className="mission-list" style={{ marginBottom: 8 }}>
        {TACTICAL_PROTOCOL_ITEMS.map((item, i) => (
          <li key={item} className="check-row">
            <input
              type="checkbox"
              checked={checks[i]}
              onChange={() => {
                const next = [...checks];
                next[i] = !next[i];
                setChecks(next);
              }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary btn-sm" onClick={savePrep}>
        Сохранить подготовку (protocol)
      </button>
      <div style={{ marginTop: 16 }}>
        <DirectorTaskPanel
          title="DIRECTOR — Pre-Contact"
          scope="influence"
          tasks={directorTasks}
          onApplied={onSaved}
          freeInputPlaceholder="Контакт, ситуация, ставка..."
        />
      </div>
    </div>
  );
}
