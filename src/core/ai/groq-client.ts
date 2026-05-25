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

function parseHealthBody(bodyText: string): { ok: boolean; message: string } {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return { ok: false, message: `Неверный ответ worker: ${bodyText.slice(0, 120)}` };
  }

  const groqErr = data.error as { message?: string } | undefined;
  const groqMsg = groqErr?.message ?? '';
  if (
    groqMsg.includes('unknown_url') ||
    groqMsg.includes('/openai/v1/health') ||
    groqMsg.includes('Unknown request URL')
  ) {
    return {
      ok: false,
      message:
        'Worker устарел: /health уходит в Groq API. Выполните npm run proxy:deploy из корня проекта, затем обновите страницу /health.',
    };
  }

  const health = data as { ok?: boolean; hasGroqKey?: boolean; service?: string };
  if (health.ok === true && health.hasGroqKey) {
    return { ok: true, message: `OK (${health.service ?? 'ayanakoji-groq-proxy'})` };
  }
  if (health.ok === true && !health.hasGroqKey) {
    return {
      ok: false,
      message: 'Worker жив, но GROQ_API_KEY не задан. Выполните: npx wrangler secret put GROQ_API_KEY',
    };
  }

  const hint = typeof data.hint === 'string' ? data.hint : '';
  if (hint) {
    return { ok: false, message: `Worker: ${hint}` };
  }

  return { ok: false, message: `Неожиданный ответ /health: ${bodyText.slice(0, 120)}` };
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
    const bodyText = await res.text();
    const parsed = parseHealthBody(bodyText);
    if (!res.ok && !parsed.message.includes('устарел')) {
      return {
        ok: false,
        message: `HTTP ${res.status}: ${bodyText.slice(0, 120)}`,
      };
    }
    return parsed;
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
