// Supabase Edge Function: send-whatsapp
// Sends a WhatsApp message via the Meta Cloud API. Only used when the app runs
// with VITE_WHATSAPP_MODE=live.
//
// Required function secrets (set with `supabase secrets set`):
//   META_WA_TOKEN            - permanent access token for the WhatsApp app
//   META_WA_PHONE_NUMBER_ID  - the sender phone-number ID from Meta
//
// Deploy:  supabase functions deploy send-whatsapp
//
// Request body: { to: string, template?: string, variables?: object, text: string }
// For Phase 1 we send an approved template when `template` is provided, else a
// plain text message (only valid inside the 24h customer-service window).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const token = Deno.env.get("META_WA_TOKEN");
    const phoneId = Deno.env.get("META_WA_PHONE_NUMBER_ID");
    if (!token || !phoneId) {
      return json({ error: "WhatsApp secrets not configured" }, 500);
    }

    const { to, template, variables, text } = await req.json();
    if (!to) return json({ error: "Missing 'to'" }, 400);

    // Normalise Indian numbers: strip non-digits, prepend country code if 10 digits.
    let phone = String(to).replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;

    const payload = template
      ? buildTemplatePayload(phone, template, variables ?? {})
      : {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: text },
        };

    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await resp.json();
    if (!resp.ok) return json({ error: data?.error?.message ?? "send failed" }, 502);
    return json({ ok: true, id: data?.messages?.[0]?.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

// Meta template messages carry ordered body parameters. We pass the same
// variables our client renders (name, id, date, amount) in a stable order.
function buildTemplatePayload(
  to: string,
  template: string,
  vars: Record<string, unknown>,
) {
  const order = ["name", "id", "date", "amount"];
  const parameters = order
    .filter((k) => vars[k] !== undefined && vars[k] !== null)
    .map((k) => ({ type: "text", text: String(vars[k]) }));

  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: "en" },
      components: [{ type: "body", parameters }],
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
