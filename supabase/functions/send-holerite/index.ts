import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { holerite_id } = await req.json();
    if (!holerite_id) {
      return new Response(JSON.stringify({ error: "holerite_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca holerite com dados do funcionário
    const { data: holerite, error: holError } = await supabase
      .from("holerites")
      .select(`id, mes_referencia, pdf_path, empresa_id, funcionario_id, funcionarios(nome_completo, email)`)
      .eq("id", holerite_id)
      .single();

    if (holError || !holerite) {
      return new Response(JSON.stringify({ error: `Holerite não encontrado: ${holError?.message}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const funcionario = holerite.funcionarios as any;
    if (!funcionario?.email) {
      return new Response(JSON.stringify({ error: `Funcionário ${funcionario?.nome_completo || "desconhecido"} não tem email cadastrado` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Baixa o PDF do Storage
    const { data: pdfData, error: storageError } = await supabase.storage
      .from("holerites")
      .download(holerite.pdf_path);

    if (storageError || !pdfData) {
      return new Response(JSON.stringify({ error: `Erro ao baixar PDF: ${storageError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Converte para base64
    const arrayBuffer = await pdfData.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Envia via Resend
    const nomeArquivo = `holerite-${holerite.mes_referencia}.pdf`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Holerites <onboarding@resend.dev>",
        to: [funcionario.email],
        subject: `Seu holerite de ${holerite.mes_referencia}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Holerite disponível</h2>
            <p>Olá ${funcionario.nome_completo},</p>
            <p>Segue em anexo seu holerite referente a <strong>${holerite.mes_referencia}</strong>.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Este é um email automático. Em caso de dúvidas, entre em contato com o RH.</p>
          </div>
        `,
        attachments: [
          {
            filename: nomeArquivo,
            content: base64Pdf,
          },
        ],
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return new Response(JSON.stringify({ error: `Resend erro: ${resendResult.message || JSON.stringify(resendResult)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza status no banco
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await adminClient
      .from("holerites")
      .update({ enviado: true, enviado_em: new Date().toISOString() })
      .eq("id", holerite_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Holerite enviado para ${funcionario.email}`,
        resend_id: resendResult.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("send-holerite error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
