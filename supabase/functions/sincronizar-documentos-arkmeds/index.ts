import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const secretKey = Deno.env.get("RPA_SECRET_KEY");
  if (authHeader !== `Bearer ${secretKey}`) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { documentos } = await req.json();
    if (!Array.isArray(documentos) || documentos.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum documento enviado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("arkmeds_documentos")
      .upsert(
        documentos.map((d: any) => ({
          base: d.base,
          tipo_documento: d.tipo_documento,
          numero_documento: d.numero_documento,
          equipamento_nome: d.equipamento_nome,
          numero_serie: d.numero_serie,
          cliente_solicitante: d.cliente_solicitante,
          status: d.status,
          motivo_problema: d.motivo_problema,
          data_validade: d.data_validade,
          url_pdf: d.url_pdf,
          conteudo_texto: d.conteudo_texto,
          conteudo_tabelas: d.conteudo_tabelas,
          data_extracao: new Date().toISOString(),
        })),
        { onConflict: "base,tipo_documento,equipamento_nome,numero_serie", ignoreDuplicates: false }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, total: documentos.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});