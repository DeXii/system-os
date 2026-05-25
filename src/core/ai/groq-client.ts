import type { DirectorConfig } from '../domain/types';

export interface GroqCallOptions {
  temperature?: number;
  maxTokens?: number;
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
      return { ok: false, error: `Groq ${res.status}: ${err.slice(0, 200)}` };
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
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
