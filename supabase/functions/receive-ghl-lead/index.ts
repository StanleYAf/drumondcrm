import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders as baseCors } from 'npm:@supabase/supabase-js@2/cors';

const corsHeaders = {
  ...baseCors,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function pick(obj: any, paths: string[]): any {
  for (const p of paths) {
    const parts = p.split('.');
    let cur: any = obj;
    let ok = true;
    for (const k of parts) {
      if (cur && typeof cur === 'object' && k in cur) cur = cur[k];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return undefined;
}

function extractProduto(raw: any): string | undefined {
    const candidates = [
      pick(raw, ['produto', 'product', 'produto_escolhido', 'produtoEscolhido',
        'customData.produto', 'customData.product', 'custom_data.produto',
        'contact.produto', 'contact.customData.produto']),
    ].filter(Boolean).map(String);
  const joined = (candidates[0] || JSON.stringify(raw)).toUpperCase();
  if (joined.includes('BMO710A') || joined.includes('BMO 710') || joined.includes('BMO-710')) return 'BMO710A';
  if (/\bI8\b/.test(joined) || joined.includes('MODELO I8')) return 'I8';
  return candidates[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SECRET = Deno.env.get('GHL_WEBHOOK_SECRET');
    const OWNER = Deno.env.get('GHL_LEAD_OWNER_USER_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SECRET || !OWNER || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Function não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provided = req.headers.get('x-webhook-secret');
    if (provided !== SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = await req.json().catch(() => ({}));
    console.log('[receive-ghl-lead] payload:', JSON.stringify(raw));

    const first = pick(raw, ['first_name', 'firstName', 'contact.first_name', 'contact.firstName']);
    const last = pick(raw, ['last_name', 'lastName', 'contact.last_name', 'contact.lastName']);
    const fullName = pick(raw, ['full_name', 'fullName', 'name', 'nome', 'nome_completo',
      'contact.name', 'contact.full_name', 'contact.fullName']);
    const nome = (fullName as string) ||
      [first, last].filter(Boolean).join(' ').trim() || 'Sem nome';

    const telefone = pick(raw, ['phone', 'telefone', 'contact.phone', 'contact.telefone',
      'customData.phone', 'custom_data.phone']);
    const email = pick(raw, ['email', 'contact.email', 'customData.email']) || null;

    const produto = extractProduto(raw);
    const utm_source = pick(raw, ['utm_source', 'utmSource', 'contact.utm_source', 'customData.utm_source']);
    const utm_medium = pick(raw, ['utm_medium', 'utmMedium', 'contact.utm_medium', 'customData.utm_medium']);
    const utm_campaign = pick(raw, ['utm_campaign', 'utmCampaign', 'contact.utm_campaign', 'customData.utm_campaign']);

    if (!telefone) {
      return new Response(JSON.stringify({ error: 'telefone ausente', raw }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let valor_estimado: number | null = null;
    if (produto === 'I8') valor_estimado = 3700;
    else if (produto === 'BMO710A') valor_estimado = 4800;

    const partes = ['Lead recebido via formulário do site (GHL)'];
    if (produto) partes.push(`Produto: ${produto}`);
    const utmParts = [
      utm_source ? `utm_source=${utm_source}` : null,
      utm_medium ? `utm_medium=${utm_medium}` : null,
      utm_campaign ? `utm_campaign=${utm_campaign}` : null,
    ].filter(Boolean);
    if (utmParts.length) partes.push(`UTMs: ${utmParts.join(' | ')}`);
    const observacoes = partes.join('\n');

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await admin.from('leads').insert({
      nome_cliente: nome,
      telefone: String(telefone),
      email,
      empresa_interna: 'Dmedical',
      origem: 'Site',
      etapa: 'novo_lead',
      valor_estimado,
      observacoes,
      user_id: OWNER,
    }).select().single();

    if (error) {
      console.error('[receive-ghl-lead] insert error', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, lead: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[receive-ghl-lead] crash', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});