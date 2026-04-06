import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_PROMPT = `Você é um especialista em leitura de folhas de ponto brasileiras.
Analise a imagem da folha de ponto com extremo cuidado. A imagem pode estar torta, borrada, com baixa resolução ou parcialmente cortada.

REGRAS DE LEITURA:
1. Leia TODOS os dias visíveis na folha, mesmo parcialmente legíveis
2. Horários podem estar em formato HH:MM, HH.MM, HHhMM ou apenas HHMM
3. Abreviações comuns: F=Folga, FJ=Falta Justificada, AT=Atestado, DSR=Descanso Semanal Remunerado, FE=Férias, LM=Licença Médica, AB=Abono
4. Se um campo está ilegível mas você consegue inferir pelo contexto (ex: padrão dos outros dias), infira e marque confianca como "baixa"
5. Horário de saída DEVE ser posterior ao de entrada. Se não for, provavelmente você leu errado
6. Valide: manhã geralmente 07:00-12:00, tarde 13:00-18:00, extra após horário normal
7. Se a folha tem formato diferente do esperado, adapte-se ao que vê

CAMPOS:
- dia: número do dia (1-31)
- me: manhã entrada (HH:MM)
- ms: manhã saída (HH:MM)  
- te: tarde entrada (HH:MM)
- ts: tarde saída (HH:MM)
- ee: extra entrada (HH:MM) ou null
- es: extra saída (HH:MM) ou null
- obs: observação (FOLGA, FALTA, ATESTADO, etc.) ou null
- confianca: "alta" ou "baixa" para cada registro`;

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
              me: { type: ["string", "null"] },
              ms: { type: ["string", "null"] },
              te: { type: ["string", "null"] },
              ts: { type: ["string", "null"] },
              ee: { type: ["string", "null"] },
              es: { type: ["string", "null"] },
              obs: { type: ["string", "null"] },
              confianca: { type: "string", enum: ["alta", "baixa"] },
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

function buildPromptWithCorrections(correcoes?: Array<{ campo: string; valor_ia: string; valor_corrigido: string; dia?: number }>) {
  let prompt = BASE_PROMPT;
  
  if (correcoes && correcoes.length > 0) {
    prompt += `\n\nAPRENDIZADO DE CORREÇÕES ANTERIORES DESTA EMPRESA:
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
  const prompt = buildPromptWithCorrections(correcoes);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: "text", text: prompt },
          ],
        },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "registrar_ponto" } },
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error(`AI gateway error (attempt ${attempt}):`, response.status, t);

    if (response.status === 429) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
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
      return JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool call arguments:", e);
    }
  }

  // Fallback: try to extract from content (if model didn't use tool calling)
  const content = data.choices?.[0]?.message?.content || "";
  if (content) {
    const clean = content.replace(/```json|```/g, "").trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (e) {
        console.error("Failed to parse content JSON:", e);
      }
    }
  }

  // Retry with simpler prompt on failure
  if (attempt < 2) {
    console.log("Retrying with fallback...");
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
