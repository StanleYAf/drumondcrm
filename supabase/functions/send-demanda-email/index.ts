import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

type Body = {
  responsavel_id: string;
  titulo: string;
  status: string;
  kind: 'assigned' | 'status_changed';
};

const FROM = Deno.env.get('RESEND_FROM') || 'DSH Hub <onboarding@resend.dev>';

function renderHtml(kind: Body['kind'], titulo: string, status: string) {
  const intro =
    kind === 'assigned'
      ? 'Você recebeu uma nova demanda.'
      : 'O status de uma demanda atribuída a você foi alterado.';
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F172A">
      <div style="background:linear-gradient(90deg,#1F4E79,#25598C);color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
        <div style="font-size:18px;font-weight:700">DSH Hub</div>
        <div style="font-size:12px;color:#BCD7EC">Notificação de demanda</div>
      </div>
      <div style="border:1px solid #E2E8F0;border-top:none;border-radius:0 0 10px 10px;padding:20px;background:#fff">
        <p style="margin:0 0 12px">${intro}</p>
        <p style="margin:0 0 6px"><strong>Título:</strong> ${escapeHtml(titulo)}</p>
        <p style="margin:0"><strong>Status:</strong> ${escapeHtml(status)}</p>
      </div>
      <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:12px">DSH Hub · Sistema de gestão integrada</p>
    </div>
  `;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Resend não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Supabase não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.responsavel_id || !body?.titulo || !body?.status || !body?.kind) {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(body.responsavel_id);
    if (uErr || !userRes?.user?.email) {
      return new Response(JSON.stringify({ error: 'Usuário sem email', detail: uErr?.message }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const to = userRes.user.email;
    const subject =
      body.kind === 'assigned'
        ? 'Nova demanda atribuída'
        : `Status da demanda alterado: ${body.titulo}`;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html: renderHtml(body.kind, body.titulo, body.status),
      }),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('Resend error', resp.status, json);
      return new Response(JSON.stringify({ error: 'Falha ao enviar email', status: resp.status, detail: json }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: json?.id, to }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-demanda-email error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});