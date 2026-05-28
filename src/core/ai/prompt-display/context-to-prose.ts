import { labelForKey } from './field-labels';
import { isEmpty } from './is-empty';

const NO_DATA = 'нету данных';
const INDENT = '  ';

function formatPrimitive(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'да' : 'нет';
  if (value === null || value === undefined) return NO_DATA;
  return String(value);
}

function formatArrayItem(item: unknown): string {
  if (item == null || typeof item !== 'object') return formatPrimitive(item);
  const o = item as Record<string, unknown>;
  const parts: string[] = [];
  if (o.date) parts.push(String(o.date));
  if (o.title) parts.push(String(o.title));
  if (o.label) parts.push(String(o.label));
  if (o.name) parts.push(String(o.name));
  if (o.codename) parts.push(String(o.codename));
  if (o.status != null) parts.push(`статус: ${o.status}`);
  if (o.priority != null) parts.push(`приоритет: ${o.priority}`);
  if (o.done != null) parts.push(o.done ? 'выполнено' : 'не выполнено');
  if (o.actualReps != null && o.targetReps != null) {
    parts.push(`повторы ${o.actualReps}/${o.targetReps}`);
  }
  if (o.exerciseId) parts.push(`упражнение: ${o.exerciseId}`);
  if (parts.length > 0) return parts.join(' · ');
  const keys = Object.keys(o).slice(0, 4);
  return keys.map((k) => `${labelForKey(k)}: ${formatPrimitive(o[k])}`).join(' · ');
}

function formatValue(value: unknown, depth: number): string[] {
  if (isEmpty(value)) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => `${INDENT.repeat(depth)}• ${formatArrayItem(item)}`);
  }

  if (typeof value !== 'object') {
    return [formatPrimitive(value)];
  }

  const lines: string[] = [];
  const obj = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    const label = labelForKey(key);
    if (isEmpty(val)) {
      lines.push(`${INDENT.repeat(depth)}${label}: ${NO_DATA}`);
      continue;
    }
    if (typeof val !== 'object' || val === null) {
      lines.push(`${INDENT.repeat(depth)}${label}: ${formatPrimitive(val)}`);
      continue;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${INDENT.repeat(depth)}${label}: ${NO_DATA}`);
      } else {
        lines.push(`${INDENT.repeat(depth)}${label}:`);
        lines.push(...formatValue(val, depth + 1));
      }
      continue;
    }
    const nested = formatValue(val, depth + 1);
    if (nested.length === 0) {
      lines.push(`${INDENT.repeat(depth)}${label}: ${NO_DATA}`);
    } else if (nested.length <= 2 && nested.every((l) => !l.includes(INDENT.repeat(depth + 1)))) {
      lines.push(`${INDENT.repeat(depth)}${label}: ${nested.map((l) => l.trim()).join('; ')}`);
    } else {
      lines.push(`${INDENT.repeat(depth)}${label}:`);
      lines.push(...nested);
    }
  }
  return lines;
}

function formatSection(title: string, data: unknown): string[] {
  const header = `▸ ${title}`;
  if (isEmpty(data)) {
    return [`${header}`, `${INDENT}${NO_DATA}`];
  }
  const body = formatValue(data, 1);
  if (body.length === 0) {
    return [`${header}`, `${INDENT}${NO_DATA}`];
  }
  return [header, ...body];
}

export function contextJsonToProse(contextJson: string): string {
  if (!contextJson.trim()) {
    return `Контекст: ${NO_DATA}`;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contextJson);
  } catch {
    return `Контекст: ${NO_DATA}`;
  }

  if (isEmpty(parsed)) {
    return `Контекст: ${NO_DATA}`;
  }

  const root = parsed as Record<string, unknown>;
  const lines: string[] = [];

  const metaKeys = ['date', 'contextLookbackDays', 'contextSinceDate', 'scope'];
  const metaParts = metaKeys
    .filter((k) => k in root && !isEmpty(root[k]))
    .map((k) => `${labelForKey(k)}: ${formatPrimitive(root[k])}`);
  if (metaParts.length > 0) {
    lines.push(...metaParts);
  }

  const sectionOrder = ['fact', 'derived', 'hints'] as const;
  const hasLayers = sectionOrder.some((k) => k in root);

  if (hasLayers) {
    for (const sectionKey of sectionOrder) {
      if (!(sectionKey in root)) continue;
      lines.push(...formatSection(labelForKey(sectionKey), root[sectionKey]));
    }
    for (const [key, val] of Object.entries(root)) {
      if (metaKeys.includes(key) || sectionOrder.includes(key as (typeof sectionOrder)[number])) {
        continue;
      }
      lines.push(...formatSection(labelForKey(key), val));
    }
  } else {
    for (const [key, val] of Object.entries(root)) {
      if (metaKeys.includes(key)) continue;
      lines.push(...formatSection(labelForKey(key), val));
    }
  }

  if (lines.length === 0) {
    return `Контекст: ${NO_DATA}`;
  }

  return lines.join('\n');
}

/** Extract JSON from legacy user message when contextJson was not stored. */
export function extractContextJsonFromUser(user: string): string {
  const marker = 'Контекст оператора:';
  const idx = user.indexOf(marker);
  if (idx < 0) return '';

  const after = user.slice(idx + marker.length).trimStart();
  const endMarkers = ['\n\nЗадача:', '\n\nВыполни задачу:', '\n\nРазрешённые'];
  let end = after.length;
  for (const m of endMarkers) {
    const p = after.indexOf(m);
    if (p >= 0) end = Math.min(end, p);
  }
  return after.slice(0, end).trim();
}
