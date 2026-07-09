// Supabase Edge Function: ai-digest
//
// Раз в 2 дня (не чаще) — реальный ИИ-разбор трат пользователя вместо
// шаблонного сообщения после каждого чека. Клиент дергает эту функцию
// при каждом открытии Главной; сама функция решает, пора ли запускать
// Gemini, свеярясь с user_settings.last_ai_digest_at — так клиенту не
// нужно ничего считать самому, а лишний вызов ИИ невозможен даже при
// повторных запросах (§2.1 — без исключений для вызова AI, но и без
// лишних трат).
//
// Deploy: supabase functions deploy ai-digest
// Secret: тот же GEMINI_API_KEY, что и у scan-receipt / ai-chat.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-2.5-flash';
const DIGEST_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let delay = 1000;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, init);
      const retriable = response.status === 429 || response.status >= 500;
      if (!retriable || attempt === attempts) return response;
    } catch (error) {
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 3;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Не авторизовано' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Не авторизовано' }, 401);
    }

    const { data: settings } = await userClient
      .from('user_settings')
      .select('ai_tips_enabled, last_ai_digest_at')
      .eq('user_id', user.id)
      .single();

    if (settings && settings.ai_tips_enabled === false) {
      return jsonResponse({ skipped: true, reason: 'disabled' });
    }

    const lastDigestAt = settings?.last_ai_digest_at ? new Date(settings.last_ai_digest_at) : null;
    const now = new Date();
    if (lastDigestAt && now.getTime() - lastDigestAt.getTime() < DIGEST_INTERVAL_MS) {
      return jsonResponse({ skipped: true, reason: 'too_soon' });
    }

    const windowStart = lastDigestAt ?? new Date(now.getTime() - DIGEST_INTERVAL_MS);

    const [{ data: receipts }, { data: limits }] = await Promise.all([
      userClient
        .from('receipts')
        .select('store_name, purchase_date, total_amount, currency, receipt_items(cleaned_name, category_name, price)')
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false }),
      userClient.from('limits').select('category_name, amount, currency').eq('user_id', user.id),
    ]);

    if (!receipts || receipts.length === 0) {
      // Нечего анализировать — сдвигаем метку, чтобы не проверять чаще раза в 2 дня.
      await userClient.from('user_settings').update({ last_ai_digest_at: now.toISOString() }).eq('user_id', user.id);
      return jsonResponse({ skipped: true, reason: 'no_data' });
    }

    if (!geminiApiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY не настроен на сервере' }, 500);
    }

    const contextSummary = { receipts, limits: limits ?? [] };

    const systemPrompt = `Ты — финансовый ассистент в приложении учёта расходов. Раз в 2 дня ты сам, без вопроса
пользователя, кратко разбираешь его траты за этот период и пишешь дружелюбное сообщение на русском:
сколько потрачено, на что больше всего, есть ли повод насторожиться (лимиты). 3-5 предложений, без воды.
Используй ТОЛЬКО данные из JSON ниже — не выдумывай цифры.

Траты пользователя за последние ~2 дня и его лимиты (JSON):
${JSON.stringify(contextSummary)}`;

    const geminiResponse = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error', geminiResponse.status, errorText);
      return jsonResponse({ error: 'Не удалось получить анализ' }, 502);
    }

    const geminiData = await geminiResponse.json();
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!replyText) {
      return jsonResponse({ error: 'ИИ вернул пустой ответ' }, 502);
    }

    await userClient.from('ai_messages').insert({ user_id: user.id, role: 'assistant', content: replyText });
    await userClient.from('user_settings').update({ last_ai_digest_at: now.toISOString() }).eq('user_id', user.id);

    const usage = geminiData.usageMetadata ?? {};
    const inputTokens = usage.promptTokenCount ?? 0;
    const outputTokens = usage.candidatesTokenCount ?? 0;
    const estimatedCost = (inputTokens * 0.3 + outputTokens * 2.5) / 1_000_000;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    await serviceClient.from('ai_api_usage').insert({
      user_id: user.id,
      model: GEMINI_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
    });

    return jsonResponse({ message: replyText });
  } catch (error) {
    console.error('ai-digest error', error);
    return jsonResponse({ error: 'Внутренняя ошибка сервера' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
