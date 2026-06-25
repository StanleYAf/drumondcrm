import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const ONESIGNAL_APP_ID = 'b2a73afd-778c-4fec-b87b-aef0ad833c2d';
const REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

type Body = {
  user_id: string;
  title: string;
  message: string;
  url?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!REST_API_KEY) {
      return new Response(JSON.stringify({ error: 'ONESIGNAL_REST_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.user_id || !body?.title || !body?.message) {
      return new Response(JSON.stringify({ error: 'user_id, title and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [body.user_id] },
      target_channel: 'push',
      headings: { en: body.title, pt: body.title },
      contents: { en: body.message, pt: body.message },
    };
    if (body.url) payload.url = body.url;

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[onesignal] error', res.status, data);
      return new Response(JSON.stringify({ error: 'onesignal_error', status: res.status, data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-onesignal-push] crash', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});