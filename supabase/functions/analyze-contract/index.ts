import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000; // 32 KB por iteração — evita estouro de pilha
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    // Auth client (com token do usuário) para validar identidade
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documento_id } = await req.json();
    if (!documento_id) {
      return new Response(JSON.stringify({ error: "documento_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client para baixar arquivo e gravar análise
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: doc, error: docErr } = await admin
      .from("funcionario_documentos")
      .select("*")
      .eq("id", documento_id)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Documento não encontrado");

    // Verifica que o usuário é dono da empresa
    const { data: emp } = await admin
      .from("empresas")
      .select("owner_id")
      .eq("id", doc.empresa_id)
      .maybeSingle();
    if (!emp || emp.owner_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Baixa o arquivo
    const { data: fileData, error: dlErr } = await admin
      .storage.from("colaborador-arquivos")
      .download(doc.storage_path);
    if (dlErr || !fileData) throw new Error("Erro ao baixar arquivo: " + dlErr?.message);

    const buf = await fileData.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const mime = doc.mime_type || "application/pdf";

    // Chamada à Lovable AI com tool calling
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em contratos de trabalho brasileiros (CLT). Extraia datas e tipo do contrato anexado. Retorne datas em formato ISO (YYYY-MM-DD). Se um campo não estiver presente, retorne null. Para tipo_contrato use exatamente um destes valores: 'experiencia_45_45' (experiência 45+45 dias), 'experiencia_90' (experiência 90 dias), 'prazo_determinado' (outro prazo determinado) ou 'indeterminado'.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise este contrato de trabalho e extraia as informações." },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${base64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extrair_dados_contrato",
              description: "Extrai dados estruturados do contrato",
              parameters: {
                type: "object",
                properties: {
                  data_admissao: { type: ["string", "null"], description: "Data de admissão (YYYY-MM-DD)" },
                  tipo_contrato: {
                    type: "string",
                    enum: ["experiencia_45_45", "experiencia_90", "prazo_determinado", "indeterminado"],
                  },
                  data_vencimento: { type: ["string", "null"], description: "Data de vencimento do contrato (YYYY-MM-DD)" },
                  data_prorrogacao: { type: ["string", "null"], description: "Data de prorrogação prevista (YYYY-MM-DD)" },
                  observacoes: { type: ["string", "null"] },
                  confianca: { type: "integer", minimum: 0, maximum: 100 },
                },
                required: ["tipo_contrato", "confianca"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extrair_dados_contrato" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiRes.text();
      throw new Error(`Erro IA [${aiRes.status}]: ${txt}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou dados estruturados");

    const extracted = JSON.parse(toolCall.function.arguments);

    // Calcula próximas férias
    let data_proximas_ferias: string | null = null;
    if (extracted.data_admissao) {
      data_proximas_ferias = addMonths(extracted.data_admissao, 12);
    }

    // Inserir/atualizar contrato_analise (substitui análise anterior do mesmo documento)
    await admin.from("contratos_analise").delete().eq("documento_id", documento_id);

    const { data: contrato, error: insErr } = await admin
      .from("contratos_analise")
      .insert({
        funcionario_id: doc.funcionario_id,
        empresa_id: doc.empresa_id,
        documento_id: doc.id,
        data_admissao: extracted.data_admissao,
        tipo_contrato: extracted.tipo_contrato,
        data_vencimento: extracted.data_vencimento,
        data_prorrogacao: extracted.data_prorrogacao,
        data_proximas_ferias,
        observacoes: extracted.observacoes,
        confianca: extracted.confianca ?? 0,
        dados_brutos: extracted,
      })
      .select()
      .single();

    if (insErr || !contrato) throw new Error("Erro ao salvar análise: " + insErr?.message);

    // Cria alertas
    const alertas: Array<{
      contrato_id: string; funcionario_id: string; empresa_id: string;
      tipo: string; data_evento: string; data_lembrete: string; status: string;
    }> = [];

    if (extracted.data_vencimento) {
      alertas.push({
        contrato_id: contrato.id,
        funcionario_id: doc.funcionario_id,
        empresa_id: doc.empresa_id,
        tipo: "vencimento_contrato",
        data_evento: extracted.data_vencimento,
        data_lembrete: addDays(extracted.data_vencimento, -2),
        status: "pendente",
      });
    }
    if (extracted.data_prorrogacao) {
      alertas.push({
        contrato_id: contrato.id,
        funcionario_id: doc.funcionario_id,
        empresa_id: doc.empresa_id,
        tipo: "prorrogacao",
        data_evento: extracted.data_prorrogacao,
        data_lembrete: addDays(extracted.data_prorrogacao, -2),
        status: "pendente",
      });
    }
    if (data_proximas_ferias) {
      alertas.push({
        contrato_id: contrato.id,
        funcionario_id: doc.funcionario_id,
        empresa_id: doc.empresa_id,
        tipo: "ferias_5_meses",
        data_evento: data_proximas_ferias,
        data_lembrete: addMonths(data_proximas_ferias, -5),
        status: "pendente",
      });
    }

    if (alertas.length > 0) {
      await admin.from("contrato_alertas").insert(alertas);
    }

    return new Response(JSON.stringify({ contrato, alertas_count: alertas.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-contract error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
