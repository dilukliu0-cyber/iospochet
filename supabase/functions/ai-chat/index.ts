// Supabase Edge Function: ai-chat
//
// Принимает вопрос пользователя (§23), собирает сводку по его расходам из
// БД (только его собственные данные — запрос идёт через клиент с его JWT,
// поэтому RLS ограничивает выборку), отвечает через Gemini текстом.
// Хранит переписку в ai_messages, логирует стоимость в ai_api_usage (§39.17).
//
// Deploy: supabase functions deploy ai-chat
// Secret: тот же GEMINI_API_KEY, что и у scan-receipt.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-2.5-flash';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// §14.2: до 3 попыток с backoff при 429/5xx/сетевых ошибках Gemini.
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

    if (!geminiApiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY не настроен на сервере' }, 500);
    }

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

    const { message, receiptId, receiptLabel } = await req.json();
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'message обязателен' }, 400);
    }

    // Сохраняем вопрос пользователя (+ метка прикреплённого чека, если есть).
    await userClient.from('ai_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
      receipt_id: receiptId ?? null,
      receipt_label: receiptLabel ?? null,
    });

    // Пользователь явно указал чек — подтягиваем его целиком (RLS пускает
    // и свои, и видимые семейные чеки) и ставим этот блок первым в промпте,
    // чтобы модель отвечала прицельно по нему.
    let attachedReceiptBlock = '';
    if (receiptId) {
      const { data: attachedReceipt } = await userClient
        .from('receipts')
        .select('store_name, store_address, purchase_date, total_amount, currency, receipt_items(cleaned_name, category_name, price, quantity)')
        .eq('id', receiptId)
        .maybeSingle();
      if (attachedReceipt) {
        attachedReceiptBlock = `\n\nПользователь прикрепил к вопросу конкретный чек — если вопрос про него (или ни на что конкретное не указывает), отвечай в первую очередь по нему:\n${JSON.stringify(attachedReceipt)}`;
      }
    }

    // Собираем контекст только по данным этого пользователя (RLS через userClient).
    const [{ data: recentItems }, { data: recentReceipts }, { data: history }, { data: limits }] =
      await Promise.all([
        userClient
          .from('receipt_items')
          .select('cleaned_name, category_name, price, quantity, receipt:receipts(store_name, purchase_date)')
          .order('created_at', { ascending: false })
          .limit(300),
        userClient
          .from('receipts')
          .select('store_name, purchase_date, total_amount, currency')
          .order('created_at', { ascending: false })
          .limit(30),
        userClient
          .from('ai_messages')
          .select('role, content')
          .order('created_at', { ascending: false })
          .limit(10),
        userClient.from('limits').select('category_name, amount, currency'),
      ]);

    // Готовая сводка по категориям за текущий месяц — модели проще опираться
    // на посчитанные цифры, чем складывать самой (меньше ошибок в арифметике).
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    const categoryTotals: Record<string, number> = {};
    const productCounts: Record<string, number> = {};
    for (const item of recentItems ?? []) {
      const date = (item as { receipt?: { purchase_date?: string | null } }).receipt?.purchase_date ?? '';
      if (date && date >= monthStartStr) {
        categoryTotals[item.category_name] = (categoryTotals[item.category_name] ?? 0) + (item.price ?? 0);
      }
      productCounts[item.cleaned_name] = (productCounts[item.cleaned_name] ?? 0) + 1;
    }
    const repeatedProducts = Object.entries(productCounts)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    const contextSummary = {
      monthCategoryTotals: categoryTotals,
      frequentlyBoughtProducts: repeatedProducts,
      limits: limits ?? [],
      recentReceipts: recentReceipts ?? [],
      recentItems: recentItems ?? [],
    };

    const conversation = (history ?? [])
      .reverse()
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `Ты — личный финансовый аналитик в приложении учёта расходов. Твоя сила — конкретика по реальным чекам пользователя.

Что ты умеешь и должен делать по запросу:
- Находить ЛИШНИЕ и импульсивные траты: частые снеки/сладкое/напитки, дублирующиеся покупки, мелкие траты, которые в сумме дают заметную цифру. Называй товары и суммы из данных.
- Считать потенциальную экономию: «если сократить X вдвое — сэкономишь ~N в месяц».
- Сравнивать траты с лимитами (limits в JSON) и предупреждать о приближении к ним.
- Замечать закономерности: в каком магазине дороже, какие категории растут.
- Отвечать на вопросы «сколько я потратил», «на что уходит больше всего» — цифры бери из monthCategoryTotals.

Правила:
- Используй ТОЛЬКО данные из JSON ниже. Не выдумывай товары, цены и проценты.
- Если данных мало для вывода — скажи честно и предложи отсканировать больше чеков.
- Пиши на русском, коротко и по делу: 3-6 предложений или маркированный список. Суммы округляй до целых.
- Не читай мораль. Дружелюбно, но конкретно: товар → сумма → совет.

Данные пользователя (JSON):
${JSON.stringify(contextSummary)}${attachedReceiptBlock}

История переписки:
${conversation || '(пусто)'}`;

    const geminiResponse = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nНовый вопрос пользователя: ${message}` }] }],
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
      return jsonResponse({ error: 'Не удалось получить ответ, попробуйте ещё раз' }, 502);
    }

    const geminiData = await geminiResponse.json();
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!replyText) {
      return jsonResponse({ error: 'ИИ вернул пустой ответ' }, 502);
    }

    const { data: savedReply, error: saveError } = await userClient
      .from('ai_messages')
      .insert({ user_id: user.id, role: 'assistant', content: replyText })
      .select()
      .single();

    if (saveError) {
      console.error('Не удалось сохранить ответ ассистента', saveError);
    }

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

    return jsonResponse({ reply: savedReply ?? { role: 'assistant', content: replyText } });
  } catch (error) {
    console.error('ai-chat error', error);
    return jsonResponse({ error: 'Внутренняя ошибка сервера' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
