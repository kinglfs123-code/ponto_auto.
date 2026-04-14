import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { holerite_id } = await req.json();
    if (!holerite_id) {
      return new Response(JSON.stringify({ error: "holerite_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch holerite with funcionario data
    const { data: holerite, error: hErr } = await adminClient
      .from("holerites")
      .select("*, funcionarios(nome_completo, email)")
      .eq("id", holerite_id)
      .single();

    if (hErr || !holerite) {
      return new Response(JSON.stringify({ error: "Holerite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: owns } = await userClient.rpc("user_owns_empresa", {
      _empresa_id: holerite.empresa_id,
    });
    if (!owns) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const func = holerite.funcionarios as any;
    if (!func?.email) {
      return new Response(JSON.stringify({ error: "Funcionário não possui e-mail cadastrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedData, error: signErr } = await adminClient.storage
      .from("holerites")
      .createSignedUrl(holerite.pdf_path, 3600);

    if (signErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch empresa name
    const { data: empresa } = await adminClient
      .from("empresas")
      .select("nome")
      .eq("id", holerite.empresa_id)
      .single();

    const empresaNome = empresa?.nome || "Empresa";

    // Send transactional email via Lovable email infrastructure
    const { error: emailError } = await adminClient.functions.invoke("send-transactional-email", {
      body: {
        templateName: "holerite-enviado",
        recipientEmail: func.email,
        idempotencyKey: `holerite-${holerite_id}-${Date.now()}`,
        templateData: {
          nomeCompleto: func.nome_completo,
          mesReferencia: holerite.mes_referencia,
          empresaNome,
          downloadUrl: signedData.signedUrl,
        },
      },
    });

    if (emailError) {
      console.error("Failed to send transactional email", emailError);
      return new Response(JSON.stringify({ error: "Falha ao enviar e-mail" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update holerite as sent
    await adminClient
      .from("holerites")
      .update({ enviado: true, enviado_em: new Date().toISOString() })
      .eq("id", holerite_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Holerite enviado com sucesso",
        email: func.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
