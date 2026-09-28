/**
 * CREDE.VIP - Clippy & AIM AI Cloudflare Worker Proxy
 * 
 * Primary Model: deepseek/deepseek-v4.1-flash
 * Fallbacks: qwen/qwen3.8-27b:free, google/gemma-4-26b-a4b-it:free, google/gemma-4-31b-it:free
 * 
 * Spending Safeguards:
 * - Controlled by OpenRouter spending limit / prepaid balance.
 * - If OpenRouter budget is exceeded (HTTP 402 Payment Required),
 *   it seamlessly cascades to free models so chat never breaks.
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

    // 2. Validate OpenRouter API Key Presence
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY secret is not configured in this Cloudflare Worker.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = await request.json();
      const prompt = (body.prompt || '').trim();
      const userState = (body.userState || '').trim();
      const customSystemPrompt = (body.systemPrompt || '').trim();

      // Guard input size: prevent prompt injection & oversized context cost
      if (!prompt || prompt.length > 500) {
        return new Response(
          JSON.stringify({ error: 'Prompt must be between 1 and 500 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. System Prompt with Live Context (custom buddy prompt if provided)
      const basePrompt = customSystemPrompt || `You are Clippy, the nostalgic, witty 90s assistant on Crede Dalton's retro Windows portfolio website (crede.vip).
Crede is a London/Kent-based creative lead, photographer (Shot by CREDE), and technologist.
Rules:
- Keep answers brief (under 3 sentences).
- Sound playfully sarcastic, friendly, and in authentic Clippy style (e.g. "It looks like...").`;

      const systemPrompt = `${basePrompt}${userState ? `\n[Context: ${userState}]` : ''}`;

      // 4. Model Hierarchy: Paid Primary (deepseek/deepseek-v4.1-flash) -> Fallbacks
      const primaryPaidModel = env.PRIMARY_MODEL || 'deepseek/deepseek-v4.1-flash';

      const modelCascade = [
        primaryPaidModel,                                      // Primary paid model: DeepSeek v4.1 Flash
        'deepseek/deepseek-chat',                              // Secondary paid fallback (DeepSeek V3)
        'qwen/qwen3.8-27b:free',                               // Free fallback 1
        'google/gemma-4-26b-a4b-it:free',                      // Free fallback 2
        'google/gemma-4-31b-it:free',                         // Free fallback 3
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'  // Free fallback 4
      ];

      // Build conversation messages
      const clientMessages = Array.isArray(body.messages) && body.messages.length > 0
        ? body.messages
        : [{ role: 'user', content: prompt }];

      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...clientMessages
      ];

      let reply = null;
      let lastError = '';

      for (const model of modelCascade) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://crede.vip',
              'X-Title': 'CREDE.VIP Clippy Companion'
            },
            body: JSON.stringify({
              model: model,
              messages: fullMessages,
              max_tokens: 350,
              temperature: 0.7,
              reasoning: { effort: 'low', exclude: true }
            })
          });

          // If credit limit reached (402 Payment Required) or rate limited (429), fall back to next model
          if (res.status === 402 || res.status === 429) {
            console.warn(`Model ${model} returned ${res.status}. Falling back to next model in cascade...`);
            continue;
          }

          if (res.ok) {
            const data = await res.json();
            let text = data.choices?.[0]?.message?.content?.trim() || '';
            // Strip think tags if model outputs them
            text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (!text && data.choices?.[0]?.message?.reasoning) {
              text = data.choices[0].message.reasoning.trim();
            }

            if (text) {
              reply = text;
              break; // Success!
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            lastError = errData?.error?.message || `Status ${res.status}`;
            continue;
          }
        } catch (fetchErr) {
          lastError = fetchErr.message;
          continue;
        }
      }

      if (!reply) {
        return new Response(
          JSON.stringify({
            reply: "It looks like my paperclip gears slipped! All upstream AI connections are momentarily occupied. Try asking again in a moment.",
            details: lastError
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
