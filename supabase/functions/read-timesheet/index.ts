import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em OCR de folhas de ponto manuscritas brasileiras. Sua tarefa é extrair com MÁXIMA PRECISÃO os dados de uma foto de folha de ponto manual.

REGRAS IMPORTANTES:
1. Se um campo estiver ilegível ou você não tiver CERTEZA (>90% confiança), retorne null para aquele campo
2. Horários DEVEM estar no formato HH:MM (ex: 08:00, 17:30) - sempre com dois dígitos
3. Horário de saída DEVE ser posterior ao de entrada. Se não for, provavelmente você leu errado
4. Valide: manhã geralmente 07:00-12:00, tarde 13:00-18:00, extra após horário normal
5. Preserve acentuação em nomes próprios
6. Para cada registro diário, forneça um número de confiança (0-100) indicando quão certo você está
7. Se a folha tem formato diferente do esperado, adapte-se ao que vê

ATENÇÃO A ERROS COMUNS DE OCR:
- Zeros (0) podem parecer com letras O
- Número 1 pode parecer com letra l (L minúsculo) ou I
- Número 5 pode parecer com letra S
- Em horários, sempre use dois dígitos: 08:00, não 8:00
- Ponto (.) deve ser interpretado como dois-pontos (:) em horários

ABREVIAÇÕES COMUNS:
F=Folga, FJ=Falta Justificada, AT=Atestado, DSR=Descanso Semanal Remunerado, FE=Férias, LM=Licença Médica, AB=Abono

STATUS DE CADA DIA:
- "normal": dia normal de trabalho
- "falta": ausência sem justificativa
- "folga": dia de descanso/DSR
- "atestado": ausência justificada por atestado médico
- "feriado": feriado nacional/estadual/municipal`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "registrar_ponto",
    description: "Registra os dados lidos da folha de ponto",
    parameters: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome do funcionário" },
        mes: { type: "string", description: "Mês de referência (ex: Janeiro/2026, 01/2026)" },
        registros: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dia: { type: "integer" },
              me: { type: ["string", "null"], description: "Entrada manhã HH:MM" },
              ms: { type: ["string", "null"], description: "Saída manhã HH:MM" },
              te: { type: ["string", "null"], description: "Entrada tarde HH:MM" },
              ts: { type: ["string", "null"], description: "Saída tarde HH:MM" },
              ee: { type: ["string", "null"], description: "Entrada extra HH:MM" },
              es: { type: ["string", "null"], description: "Saída extra HH:MM" },
              obs: { type: ["string", "null"], description: "Observação: FOLGA, FALTA, ATESTADO, etc." },
              status: {
                type: "string",
                enum: ["normal", "falta", "folga", "atestado", "feriado"],
                description: "Status do dia",
              },
              confianca: {
                type: "integer",
                description: "Confiança de 0 a 100 na leitura deste registro",
              },
            },
            required: ["dia", "confianca"],
            additionalProperties: false,
          },
        },
      },
      required: ["nome", "mes", "registros"],
      additionalProperties: false,
    },
  },
};

/** Auto-correct common OCR misreads in time strings */
function autoCorrectTime(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim();
  s = s.replace(/O/g, "0");
  s = s.replace(/l(?=\d)/g, "1");
  s = s.replace(/I(?=\d)/g, "1");
  s = s.replace(/S(?=\d)/g, "5");
  s = s.replace(/\./g, ":");
  // Add leading zero
  if (/^\d:\d{2}$/.test(s)) s = "0" + s;
  return s;
}

function autoCorrectRegistros(registros: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const timeFields = ["me", "ms", "te", "ts", "ee", "es"];
  return registros.map((reg) => {
    const corrected = { ...reg };
    for (const field of timeFields) {
      corrected[field] = autoCorrectTime(corrected[field] as string | null);
    }
    return corrected;
  });
}

function buildPromptWithLearning(correcoes?: Array<{ campo: string; valor_ia: string; valor_corrigido: string; dia?: number }>) {
  let prompt = SYSTEM_PROMPT;

  if (correcoes && correcoes.length > 0) {
    prompt += `\n\nAPRENDIZADO DE CORREÇÕES ANTERIORES:
As seguintes correções foram feitas pelo usuário em leituras anteriores. Use como referência para melhorar sua leitura:`;

    for (const c of correcoes.slice(0, 20)) {
      prompt += `\n- Campo "${c.campo}"${c.dia ? ` (dia ${c.dia})` : ""}: IA leu "${c.valor_ia}" → correto é "${c.valor_corrigido}"`;
    }

    prompt += `\n\nConsidere esses padrões ao ler esta folha.`;
  }

  return prompt;
}

async function callAIWithRetry(
  apiKey: string,
  image: string,
  correcoes?: Array<{ campo: string; valor_ia: string; valor_corrigido: string; dia?: number }>,
  attempt = 1
): Promise<{ nome: string; mes: string; registros: Array<Record<string, unknown>> }> {
  const systemPrompt = buildPromptWithLearning(correcoes);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: "text", text: "Extraia todos os dados desta folha de ponto manual." },
          ],
        },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "registrar_ponto" } },
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error(`AI gateway error (attempt ${attempt}):`, response.status, t);

    if (response.status === 429) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        return callAIWithRetry(apiKey, image, correcoes, attempt + 1);
      }
      throw { status: 429, message: "Rate limit exceeded. Tente novamente em alguns segundos." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." };
    }
    throw { status: 500, message: `AI gateway error: ${response.status}` };
  }

  const data = await response.json();

  // Extract from tool calling response
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      // Apply auto-correction to all time fields
      if (parsed.registros) {
        parsed.registros = autoCorrectRegistros(parsed.registros);
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse tool call arguments:", e);
    }
  }

  // Fallback: try content
  const content = data.choices?.[0]?.message?.content || "";
  if (content) {
    const clean = content.replace(/```json|```/g, "").trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (parsed.registros) {
          parsed.registros = autoCorrectRegistros(parsed.registros);
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse content JSON:", e);
      }
    }
  }

  // Retry on failure
  if (attempt < 3) {
    console.log(`Retrying (attempt ${attempt + 1})...`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return callAIWithRetry(apiKey, image, correcoes, attempt + 1);
  }

  throw { status: 500, message: "Não foi possível extrair dados da imagem. Tente com uma foto mais nítida." };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, test, correcoes } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Simple test mode
    if (test) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: "Responda apenas: OK" }],
          max_tokens: 50,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        return new Response(JSON.stringify({ error: `API error ${response.status}: ${t}` }), {
          status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "OK";
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Image reading mode
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await callAIWithRetry(LOVABLE_API_KEY, image, correcoes);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("read-timesheet error:", e);
    const err = e as { status?: number; message?: string };
    const status = err.status || 500;
    const message = err.message || (e instanceof Error ? e.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
