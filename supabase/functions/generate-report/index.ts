import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { empresa_id, mes_referencia } = await req.json();
    if (!empresa_id || !mes_referencia) {
      return new Response(JSON.stringify({ error: "empresa_id and mes_referencia required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id, nome, cnpj, owner_id")
      .eq("id", empresa_id)
      .single();

    if (!empresa || empresa.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found or not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get folhas + registros for this company and month
    const { data: folhas } = await supabase
      .from("folhas_ponto")
      .select("*, registros_ponto(*)")
      .eq("empresa_id", empresa_id)
      .eq("mes_referencia", mes_referencia)
      .order("funcionario");

    if (!folhas || folhas.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma folha encontrada para este mês" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate simple text-based report (PDF generation would need a library)
    // For now, generate a structured JSON report and store it
    const report = {
      empresa: { nome: empresa.nome, cnpj: empresa.cnpj },
      mes_referencia,
      gerado_em: new Date().toISOString(),
      funcionarios: folhas.map((f: any) => {
        const regs = f.registros_ponto || [];
        const totNormais = regs.reduce((s: number, r: any) => s + (r.horas_normais || 0), 0);
        const totExtras = regs.reduce((s: number, r: any) => s + (r.horas_extras || 0), 0);
        const totNoturnas = regs.reduce((s: number, r: any) => s + (r.horas_noturnas || 0), 0);
        return {
          nome: f.funcionario,
          status: f.status,
          dias: regs.length,
          horas_normais: Math.round(totNormais * 100) / 100,
          horas_extras: Math.round(totExtras * 100) / 100,
          horas_noturnas: Math.round(totNoturnas * 100) / 100,
          registros: regs.sort((a: any, b: any) => a.dia - b.dia),
        };
      }),
    };

    // Store as JSON file (a proper PDF lib can be added later)
    const fileName = `${user.id}/${empresa_id}_${mes_referencia}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });

    const { error: uploadErr } = await supabase.storage
      .from("relatorios")
      .upload(fileName, blob, { contentType: "application/json", upsert: true });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Erro ao salvar relatório: " + uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into relatorios table
    await supabase.from("relatorios").insert({
      empresa_id,
      mes_referencia,
      pdf_path: fileName,
    });

    return new Response(JSON.stringify({ success: true, path: fileName, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
