/**
 * Groq API CORS proxy for AYANAKOJI OS (release)
 * API key lives in worker secret GROQ_API_KEY (wrangler secret put GROQ_API_KEY)
 * Optional: PROXY_TOKEN — client sends X-Ayanakoji-Token header
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ayanakoji-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (env.PROXY_TOKEN) {
      const token = request.headers.get('X-Ayanakoji-Token');
      if (token !== env.PROXY_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured on worker' }),
        {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(request.url);
    const target = `https://api.groq.com/openai/v1${url.pathname.replace(/^\/v1/, '')}${url.search}`;

    try {
      const headers = new Headers();
      headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
      headers.set('Authorization', `Bearer ${apiKey}`);

      const res = await fetch(target, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      const out = new Headers(res.headers);
      Object.entries(cors).forEach(([k, v]) => out.set(k, v));

      return new Response(res.body, { status: res.status, headers: out });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
