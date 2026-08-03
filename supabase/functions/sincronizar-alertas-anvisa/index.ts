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
    const { alertas } = await req.json();
    if (!Array.isArray(alertas) || alertas.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum alerta enviado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("anvisa_alertas")
      .upsert(
        alertas.map((a: any) => ({
          equipamento_id: a.equipamento_id,
          numero_alerta: a.numero_alerta,
          titulo: a.titulo,
          url: a.url,
          registro_anvisa: a.registro_anvisa,
        })),
        { onConflict: "equipamento_id,numero_alerta", ignoreDuplicates: false }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, total: alertas.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});