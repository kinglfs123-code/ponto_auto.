import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TITULOS: Record<string, string> = {
  vencimento_contrato: "⚠️ Vence contrato",
  prorrogacao: "📝 Prorrogar contrato",
  ferias_5_meses: "🌴 Férias se aproximam",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_TOKEN = Deno.env.get("GOOGLE_CALENDAR_ACCESS_TOKEN");

    if (!GOOGLE_TOKEN) {
      return new Response(JSON.stringify({
        error: "Google Agenda não conectado",
        needs_connection: true,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { alerta_ids } = await req.json();
    if (!Array.isArray(alerta_ids) || alerta_ids.length === 0) {
      return new Response(JSON.stringify({ error: "alerta_ids obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: alertas, error: aErr } = await admin
      .from("contrato_alertas")
      .select("*, funcionarios:funcionario_id(nome_completo), empresas:empresa_id(owner_id)")
      .in("id", alerta_ids);

    if (aErr || !alertas) throw new Error("Erro ao carregar alertas");

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const al of alertas) {
      // valida ownership
      // @ts-ignore embedded relation
      const ownerId = al.empresas?.owner_id;
      if (ownerId !== userData.user.id) {
        results.push({ id: al.id, status: "erro", error: "sem permissão" });
        continue;
      }
      // @ts-ignore
      const nome = al.funcionarios?.nome_completo || "colaborador";
      const titulo = `${TITULOS[al.tipo] || "Alerta"} — ${nome}`;

      try {
        const event = {
          summary: titulo,
          description: `Lembrete automático gerado pela aplicação.\nEvento real: ${al.data_evento}`,
          start: { date: al.data_lembrete },
          end: { date: al.data_lembrete },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 60 * 24 }],
          },
        };

        let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
        let method = "POST";
        if (al.google_event_id) {
          url = `${url}/${al.google_event_id}`;
          method = "PUT";
        }

        const resp = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${GOOGLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          await admin.from("contrato_alertas").update({
            status: "erro", erro_mensagem: txt.slice(0, 500),
          }).eq("id", al.id);
          results.push({ id: al.id, status: "erro", error: txt });
          continue;
        }

        const json = await resp.json();
        await admin.from("contrato_alertas").update({
          status: "sincronizado",
          google_event_id: json.id,
          erro_mensagem: null,
        }).eq("id", al.id);
        results.push({ id: al.id, status: "sincronizado" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro";
        await admin.from("contrato_alertas").update({
          status: "erro", erro_mensagem: msg,
        }).eq("id", al.id);
        results.push({ id: al.id, status: "erro", error: msg });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-calendar-alerts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
