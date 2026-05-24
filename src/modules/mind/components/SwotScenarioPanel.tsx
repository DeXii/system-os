import { useEffect, useState } from 'react';
import { db, todayKey } from '@/core/db';
import { afterScenarioComplete } from '@/core/engines/os-kernel';
import { runDirectorTask } from '@/core/ai/director-service';
import { SWOT_HINTS } from '@/content/mind-protocols';
import type { ScenarioAnalysis } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
  throttleHint?: string | null;
}

export function SwotScenarioPanel({ onSaved, throttleHint }: Props) {
  const [history, setHistory] = useState<ScenarioAnalysis[]>([]);
  const [directorReview, setDirectorReview] = useState('');
  const [loadingReview, setLoadingReview] = useState(false);
  const [includeDecision, setIncludeDecision] = useState(true);
  const [form, setForm] = useState({
    title: '',
    strengths: '',
    weaknesses: '',
    opportunities: '',
    threats: '',
    scenariosText: '',
    decision: '',
    decisionContext: '',
    decisionAlternatives: '',
    decisionChoice: '',
    decisionExpected: '',
  });

  const load = async () => {
    setHistory(await db.scenarios.orderBy('date').reverse().limit(6).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const requestSwotReview = async () => {
    setLoadingReview(true);
    const msg = `SWOT review для ситуации "${form.title}":
S: ${form.strengths}
W: ${form.weaknesses}
O: ${form.opportunities}
T: ${form.threats}
Сценарии: ${form.scenariosText}`;
    const res = await runDirectorTask('mindCoach', { scope: 'mind', userMessage: msg });
    setLoadingReview(false);
    if (res.ok) setDirectorReview(res.insight.text);
    else setDirectorReview(res.error);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const decisionPayload = includeDecision
      ? {
          date: todayKey(),
          title: form.title,
          context: form.decisionContext || form.title,
          alternatives: form.decisionAlternatives,
          choice: form.decisionChoice || form.decision,
          expectedOutcome: form.decisionExpected,
        }
      : undefined;

    await afterScenarioComplete(
      {
        date: todayKey(),
        title: form.title,
        strengths: form.strengths,
        weaknesses: form.weaknesses,
        opportunities: form.opportunities,
        threats: form.threats,
        scenariosText: form.scenariosText,
        decision: form.decision,
        directorReview: directorReview || undefined,
      },
      decisionPayload ? { decisionLog: decisionPayload } : undefined
    );

    setForm({
      title: '',
      strengths: '',
      weaknesses: '',
      opportunities: '',
      threats: '',
      scenariosText: '',
      decision: '',
      decisionContext: '',
      decisionAlternatives: '',
      decisionChoice: '',
      decisionExpected: '',
    });
    setDirectorReview('');
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Strategic Forecasting (SWOT)</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          SWOT и scenario analysis — разбор ситуации; при cognitive throttle DIRECTOR ограничивает
          тяжёлый swot review.
        </p>
      </GlossaryZone>
      {throttleHint && <div className="alert-banner">{throttleHint}</div>}
      <div className="form-row">
        <label className="label">Ситуация</label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      {(Object.keys(SWOT_HINTS) as (keyof typeof SWOT_HINTS)[]).map((key) => (
        <div key={key} className="form-row">
          <label className="label">{key.toUpperCase()}</label>
          <textarea
            className="textarea"
            placeholder={SWOT_HINTS[key]}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}
      <div className="form-row">
        <label className="label">Сценарии (текст)</label>
        <textarea
          className="textarea"
          value={form.scenariosText}
          onChange={(e) => setForm({ ...form, scenariosText: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Решение</label>
        <textarea
          className="textarea"
          value={form.decision}
          onChange={(e) => setForm({ ...form, decision: e.target.value })}
        />
      </div>
      <label style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={includeDecision}
          onChange={(e) => setIncludeDecision(e.target.checked)}
        />
        Создать связанный decision log
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className="btn btn-sm"
          disabled={loadingReview || !form.title}
          onClick={requestSwotReview}
        >
          DIRECTOR: разбор SWOT
        </button>
        <button type="button" className="btn btn-primary" onClick={save}>
          Сохранить анализ
        </button>
      </div>
      {directorReview && (
        <div className="director-output" style={{ marginBottom: 8 }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{directorReview}</pre>
        </div>
      )}
      {history.map((h) => (
        <div key={h.id} className="kernel-line">
          {h.date}: {h.title}
          {h.linkedDecisionId ? ' · decision linked' : ''}
        </div>
      ))}
    </div>
  );
}
