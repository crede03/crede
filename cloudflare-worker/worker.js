/**
 * CREDE.VIP - Clippy AI Cloudflare Worker Proxy
 * Model: qwen/qwen3.8-27b:free
 * Keeps OPENROUTER_API_KEY secure on the server side
 */

export default {
  async fetch(request, env) {
    // 1. CORS Preflight & Origin Verification
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://crede.vip',
      'https://crededalton.github.io',
      'http://localhost:4321',
      'http://127.0.0.1:4321',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.github.io');

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'https://crede.vip',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Validate API Key Presence
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'OPENROUTER_API_KEY secret is not configured in this Cloudflare Worker.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = await request.json();
      const prompt = (body.prompt || '').trim();
      const userState = (body.userState || '').trim();

      if (!prompt || prompt.length > 300) {
        return new Response(
          JSON.stringify({ error: 'Prompt must be between 1 and 300 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. System Prompt with Live Context
      const systemPrompt = `You are Clippy, the nostalgic, witty 90s assistant on Crede Dalton's retro Windows portfolio website (crede.vip).
Crede is a London/Kent-based creative lead, photographer (Shot by CREDE), and technologist.
Rules:
- Keep your answers brief (under 3 sentences).
- Sound playfully sarcastic, friendly, and in authentic Clippy style (e.g. "It looks like...").
- ${userState ? `Live visitor context: ${userState}` : ''}`;

      // 4. Query OpenRouter with qwen/qwen3.8-27b:free
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://crede.vip',
          'X-Title': 'CREDE.VIP Clippy Companion'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 140,
          temperature: 0.7,
          reasoning: { effort: 'low' } // Keeps free Qwen model responses fast and concise
        })
      });

      if (!openRouterRes.ok) {
        const errorText = await openRouterRes.text();
        return new Response(
          JSON.stringify({ error: `OpenRouter error (${openRouterRes.status})`, details: errorText }),
          { status: openRouterRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await openRouterRes.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "It looks like my paperclip gears slipped! Try asking again.";

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Worker error', details: err.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};
