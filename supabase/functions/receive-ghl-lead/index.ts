import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Nome do responsável padrão, exibido no card do Kanban (coluna "responsavel", separada do user_id)
const LEAD_OWNER_NAME = "André Drumond";

function normalize(str: string | undefined | null) {
  return (str || "").toString().trim();
}

// Tenta achar um valor em várias formas comuns que o payload do GHL costuma usar
function pick(body: any, paths: string[]): string {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), body);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Segurança: exige um segredo compartilhado no header, configurado também no Header do Webhook no GHL ──
    const WEBHOOK_SECRET = Deno.env.get("GHL_WEBHOOK_SECRET");
    const incomingSecret = req.headers.get("x-webhook-secret");
    if (WEBHOOK_SECRET && incomingSecret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // ⚠️ Troque esse valor pelo UUID real assim que você pegar na tabela profiles.
    const LEAD_OWNER_USER_ID = Deno.env.get("GHL_LEAD_OWNER_USER_ID") || "COLOQUE_AQUI_O_USER_ID";

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Supabase não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Log bruto do payload — essencial pra conferir o formato real que o GHL manda
    // (olhe em Supabase > Edge Functions > receive-ghl-lead > Logs)
    console.log("Payload recebido do GHL:", JSON.stringify(body));

    // Nome: tenta full_name, depois first_name + last_name, em vários caminhos possíveis
    const fullNameDirect = pick(body, ["full_name", "contact.full_name", "name"]);
    const firstName = pick(body, ["first_name", "contact.first_name"]);
    const lastName = pick(body, ["last_name", "contact.last_name"]);
    const nomeCliente =
      fullNameDirect || [firstName, lastName].filter(Boolean).join(" ") || "Lead sem nome (ver observações)";

    const telefone = pick(body, ["phone", "contact.phone", "phone_number"]);
    const email = pick(body, ["email", "contact.email"]);

    // Campo "Qual a sua escolha" do formulário — ajuste a chave conforme o nome real do campo no GHL
    const produtoEscolhido = normalize(
      pick(body, ["qual_a_sua_escolha", "customData.qual_a_sua_escolha", "form.qual_a_sua_escolha"]),
    );

    // UTMs, se vierem no payload — guardados em observações já que a tabela não tem colunas próprias pra isso
    const utmSource = pick(body, ["utm_source", "customData.utm_source"]);
    const utmMedium = pick(body, ["utm_medium", "customData.utm_medium"]);
    const utmCampaign = pick(body, ["utm_campaign", "customData.utm_campaign"]);

    const observacoesPartes = [
      "Lead recebido via formulário do site (GHL).",
      produtoEscolhido ? `Produto de interesse: ${produtoEscolhido}` : null,
      utmSource || utmMedium || utmCampaign
        ? `UTM: source=${utmSource || "-"} | medium=${utmMedium || "-"} | campaign=${utmCampaign || "-"}`
        : null,
    ].filter(Boolean);

    if (!telefone) {
      return new Response(JSON.stringify({ error: "Telefone ausente no payload", payload: body }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data, error } = await admin
      .from("leads")
      .insert({
        nome_cliente: nomeCliente,
        telefone,
        email: email || null,
        empresa_interna: "Dmedical",
        origem: "Site",
        etapa: "novo_lead",
        responsavel: LEAD_OWNER_NAME,
        observacoes: observacoesPartes.join("\n"),
        user_id: LEAD_OWNER_USER_ID,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao inserir lead:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, lead: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(JSON.stringify({ error: "Erro interno", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
