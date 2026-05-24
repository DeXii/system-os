import { GLOSSARY_TERM_KEYS, normalizeGlossaryTerm } from './dictionary.ru';

export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'term'; value: string; key: string };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isWordBoundary(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1] : '';
  const after = end < text.length ? text[end] : '';
  const boundary = /[\s([{"«—–\-.,;:!?]|^$/;
  const beforeOk = !before || boundary.test(before) || !/\w/.test(before);
  const afterOk = !after || boundary.test(after) || !/\w/.test(after);
  return beforeOk && afterOk;
}

/**
 * Разбивает строку на обычный текст и совпадения со словарём (longest-match-first).
 */
export function segmentText(text: string): TextSegment[] {
  if (!text) return [{ type: 'text', value: '' }];

  const segments: TextSegment[] = [];
  let pos = 0;

  while (pos < text.length) {
    let best: { key: string; start: number; end: number; display: string } | null = null;

    for (const key of GLOSSARY_TERM_KEYS) {
      const re = new RegExp(escapeRegex(key), 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (start < pos) continue;
        if (!isWordBoundary(text, start, end)) continue;
        if (!best || start < best.start || (start === best.start && key.length > best.key.length)) {
          best = {
            key: normalizeGlossaryTerm(key),
            start,
            end,
            display: text.slice(start, end),
          };
        }
        break;
      }
    }

    if (!best) {
      segments.push({ type: 'text', value: text.slice(pos) });
      break;
    }

    if (best.start > pos) {
      segments.push({ type: 'text', value: text.slice(pos, best.start) });
    }
    segments.push({ type: 'term', value: best.display, key: best.key });
    pos = best.end;
  }

  return mergeAdjacentText(segments);
}

function mergeAdjacentText(segments: TextSegment[]): TextSegment[] {
  const out: TextSegment[] = [];
  for (const seg of segments) {
    const last = out[out.length - 1];
    if (seg.type === 'text' && last?.type === 'text') {
      last.value += seg.value;
    } else {
      out.push(seg.type === 'text' ? { ...seg } : { ...seg });
    }
  }
  return out.length ? out : [{ type: 'text', value: '' }];
}
