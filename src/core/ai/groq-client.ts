import type { DirectorConfig } from '../domain/types';

export interface GroqCallOptions {
  temperature?: number;
  maxTokens?: number;
}

function isConnectionError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    msg === 'Failed to fetch' ||
    lower.includes('connection reset') ||
    lower.includes('network error') ||
    lower.includes('load failed')
  );
}

export function formatFetchError(e: unknown, proxyUrl?: string): string {
  const msg = e instanceof Error ? e.message : 'Network error';
  const cause =
    e instanceof Error && e.cause instanceof Error ? String(e.cause.message) : '';
  if (isConnectionError(msg) || isConnectionError(cause)) {
    const healthHint = proxyUrl ? `${proxyUrl}/health` : '/health на worker URL';
    return (
      `Сеть: proxy недоступен (404 / connection reset). Откройте ${healthHint} в браузере, ` +
      'выполните `npx wrangler deploy` в workers/groq-proxy, проверьте Proxy URL в ARCHIVE ' +
      '(должен совпадать с VITE_GROQ_PROXY_URL в GitHub secrets).'
    );
  }
  return msg;
}

export function formatGroqHttpError(status: number, body: string): string {
  if (status === 403) {
    return (
      'Groq 403 Forbidden: ключ недействителен или доступ ограничен. ' +
      'Создайте API key в console.groq.com через VPN; DIRECTOR ходит в Groq через Cloudflare Worker, не с вашего IP.'
    );
  }
  return `Groq ${status}: ${body.slice(0, 200)}`;
}

export async function testProxyHealth(
  cfg: DirectorConfig
): Promise<{ ok: boolean; message: string }> {
  if (!cfg.proxyUrl) {
    return { ok: false, message: 'Укажите Proxy URL' };
  }
  try {
    const headers: Record<string, string> = {};
    if (cfg.proxyToken) {
      headers['X-Ayanakoji-Token'] = cfg.proxyToken;
    }
    const res = await fetch(`${cfg.proxyUrl}/health`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status} — worker не найден или неверный URL. Передеплойте: wrangler deploy`,
      };
    }
    const data = (await res.json()) as { ok?: boolean; hasGroqKey?: boolean; service?: string };
    if (!data.hasGroqKey) {
      return {
        ok: false,
        message: 'Worker жив, но GROQ_API_KEY не задан. Выполните: npx wrangler secret put GROQ_API_KEY',
      };
    }
    return { ok: true, message: `OK (${data.service ?? 'proxy'})` };
  } catch (e) {
    return { ok: false, message: formatFetchError(e, cfg.proxyUrl) };
  }
}

export async function callGroq(
  system: string,
  user: string,
  cfg: DirectorConfig,
  options?: GroqCallOptions
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cfg.apiKey) {
      headers.Authorization = `Bearer ${cfg.apiKey}`;
    }
    if (cfg.proxyToken) {
      headers['X-Ayanakoji-Token'] = cfg.proxyToken;
    }

    const res = await fetch(`${cfg.proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: formatGroqHttpError(res.status, err) };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    return { ok: true, text };
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      return { ok: false, error: 'Таймаут Groq (90 с). Повторите или сократите запрос.' };
    }
    return { ok: false, error: formatFetchError(e, cfg.proxyUrl) };
  }
}
