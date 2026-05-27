import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CHUNK_SIZE = 500;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const rpaKey = authHeader.replace("Bearer ", "").trim();
  const expectedKey = Deno.env.get("RPA_SECRET_KEY");

  if (!expectedKey || rpaKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { cliente_id, mes, ano, indicadores, tecnicos, ordens_servico } = body;

  if (!mes || !ano) {
    return new Response(JSON.stringify({ error: "mes e ano são obrigatórios" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Deleta indicadores_manutencao
    let queryInd = supabase
      .from("indicadores_manutencao")
      .delete()
      .eq("mes", mes)
      .eq("ano", ano);
    if (cliente_id !== null && cliente_id !== undefined) {
      queryInd = queryInd.eq("cliente_id", cliente_id);
    } else {
      queryInd = queryInd.is("cliente_id", null);
    }
    await queryInd;

    // Deleta tecnicos_manutencao
    let queryTec = supabase
      .from("tecnicos_manutencao")
      .delete()
      .eq("mes", mes)
      .eq("ano", ano);
    if (cliente_id !== null && cliente_id !== undefined) {
      queryTec = queryTec.eq("cliente_id", cliente_id);
    } else {
      queryTec = queryTec.is("cliente_id", null);
    }
    await queryTec;

    // Deleta ordens_servico
    let queryOS = supabase
      .from("ordens_servico")
      .delete()
      .eq("mes", mes)
      .eq("ano", ano);
    if (cliente_id !== null && cliente_id !== undefined) {
      queryOS = queryOS.eq("cliente_id", cliente_id);
    } else {
      queryOS = queryOS.is("cliente_id", null);
    }
    await queryOS;

    if (indicadores?.length > 0) {
      const { error } = await supabase.from("indicadores_manutencao").insert(indicadores);
      if (error) throw new Error(`indicadores: ${error.message}`);
    }

    if (tecnicos?.length > 0) {
      const { error } = await supabase.from("tecnicos_manutencao").insert(tecnicos);
      if (error) throw new Error(`tecnicos: ${error.message}`);
    }

    if (ordens_servico?.length > 0) {
      for (let i = 0; i < ordens_servico.length; i += CHUNK_SIZE) {
        const chunk = ordens_servico.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from("ordens_servico").insert(chunk);
        if (error) throw new Error(`ordens_servico chunk ${i}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        resumo: {
          mes, ano, cliente_id,
          indicadores: indicadores?.length ?? 0,
          tecnicos: tecnicos?.length ?? 0,
          ordens_servico: ordens_servico?.length ?? 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
