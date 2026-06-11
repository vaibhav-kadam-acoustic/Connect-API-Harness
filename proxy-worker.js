/**
 * Acoustic Connect GraphQL Proxy — Cloudflare Worker
 *
 * Deploy steps (2 min, free account):
 *   1. Go to https://workers.cloudflare.com → sign up / log in
 *   2. Click "Create a Worker"
 *   3. Paste this entire file into the editor, click "Deploy"
 *   4. Copy the *.workers.dev URL shown after deploy
 *   5. Paste that URL into the "Proxy" field in the Connect API Harness
 *
 * The worker receives: { endpoint, apiKey, query }
 * and forwards the request to the Connect GraphQL API with proper headers.
 */

const ALLOWED_ORIGINS = [
  'https://vaibhav-kadam-acoustic.github.io',
  'https://connect-api-harness.acoustic.com',
  'http://localhost',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const { endpoint, apiKey, query } = body;

    if (!endpoint || !apiKey || !query) {
      return new Response(JSON.stringify({ error: 'Missing endpoint, apiKey, or query' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // Forward to the Connect GraphQL API
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ query }),
    });

    const data = await upstream.text();

    return new Response(data, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  },
};
